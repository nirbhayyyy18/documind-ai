import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { extractPdfPages } from "../services/pdf.service.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/", async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId!;

  try {
    const result = await pool.query(
      `SELECT id, filename, page_count, status
       FROM documents
       WHERE user_id = $1
         AND status = 'ready'
       ORDER BY created_at DESC`,
      [userId],
    );

    res.status(200).json({
      success: true,
      documents: result.rows.map((row) => ({
        id: row.id as string,
        filename: row.filename as string,
        pageCount: Number(row.page_count),
        status: row.status as string,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch uploaded documents:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch uploaded documents.",
    });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") {
      callback(new Error("Only PDF files are allowed."));
      return;
    }

    callback(null, true);
  },
});

router.post("/extract", upload.single("file"), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId!;
  let documentId: string | null = null;

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
      return;
    }

    documentId = randomUUID();

    await pool.query(
      `INSERT INTO documents (
        id,
        user_id,
        filename,
        mime_type,
        file_size,
        page_count,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 0, 'processing')`,
      [
        documentId,
        userId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      ],
    );

    const pages = await extractPdfPages(req.file.buffer);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const page of pages) {
        await client.query(
          `INSERT INTO document_chunks (
            document_id,
            page_number,
            context
          )
          VALUES ($1, $2, $3)`,
          [documentId, page.pageNumber, page.text],
        );
      }

      const updateResult = await client.query(
        `UPDATE documents
         SET page_count = $1,
             status = 'ready'
         WHERE id = $2
           AND user_id = $3`,
        [pages.length, documentId, userId],
      );

      if (updateResult.rowCount !== 1) {
        throw new Error("Document ownership verification failed.");
      }

      await client.query("COMMIT");
    } catch (databaseError) {
      await client.query("ROLLBACK");
      throw databaseError;
    } finally {
      client.release();
    }

    res.status(201).json({
      success: true,
      message: "PDF uploaded and processed successfully.",
      document: {
        id: documentId,
        filename: req.file.originalname,
        pageCount: pages.length,
        status: "ready",
      },
      pages,
    });
  } catch (error) {
    console.error(
      "PDF processing failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    if (documentId) {
      try {
        await pool.query(
          `UPDATE documents
           SET status = 'failed'
           WHERE id = $1
             AND user_id = $2`,
          [documentId, userId],
        );
      } catch (updateError) {
        console.error("Could not update document status:", updateError);
      }
    }

    res.status(422).json({
      success: false,
      message:
        "Unable to process this PDF. Please check the file and try again.",
    });
  }
});

export default router;
