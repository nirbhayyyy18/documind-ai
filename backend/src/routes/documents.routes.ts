import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { pool } from "../db.js";
import { extractPdfPages } from "../services/pdf.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filename, page_count, status
       FROM documents
       WHERE status = 'ready'
       ORDER BY created_at DESC`,
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

    // Step 1: Save document metadata.
    await pool.query(
      `INSERT INTO documents (
        id,
        filename,
        mime_type,
        file_size,
        page_count,
        status
      )
      VALUES ($1, $2, $3, $4, 0, 'processing')`,
      [
        documentId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      ],
    );

    // Step 2: Extract text from the PDF.
    const pages = await extractPdfPages(req.file.buffer);

    // Step 3: Save extracted page text and update status.
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

      await client.query(
        `UPDATE documents
         SET page_count = $1,
             status = 'ready'
         WHERE id = $2`,
        [pages.length, documentId],
      );

      await client.query("COMMIT");
    } catch (databaseError) {
      await client.query("ROLLBACK");
      throw databaseError;
    } finally {
      client.release();
    }

    // Step 4: Return the saved document details.
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
    console.error("PDF processing failed:", error);

    // Mark the document as failed if its metadata was saved.
    if (documentId) {
      try {
        await pool.query(
          `UPDATE documents
           SET status = 'failed'
           WHERE id = $1`,
          [documentId],
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