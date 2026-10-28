import { Router } from "express";
import { pool } from "../db.js";
import { generateDocumentAnswer } from "../services/answer.service.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

// All search requests require authentication.
router.use(authenticateToken);

router.get("/", async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId!;

  try {
    const question =
      typeof req.query.q === "string" ? req.query.q.trim() : "";

    const documentId =
      typeof req.query.documentId === "string"
        ? req.query.documentId.trim()
        : "";

    if (!question) {
      res.status(400).json({
        success: false,
        message: "Please provide a search question using the q parameter.",
      });
      return;
    }

    if (question.length > 500) {
      res.status(400).json({
        success: false,
        message: "The search question must be 500 characters or fewer.",
      });
      return;
    }

    // Validate documentId before PostgreSQL attempts a UUID cast.
    if (
      documentId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        documentId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid document ID.",
      });
      return;
    }

    const stopWords = new Set([
      "a", "an", "and", "are", "as", "at", "be", "by",
      "for", "from", "how", "i", "in", "is", "it", "list",
      "of", "on", "or", "the", "to", "what", "which",
      "who", "why", "with", "would", "should", "could",
      "all", "do", "does", "can", "give", "brief",
      "explain", "tell", "me", "about", "please",
    ]);

    const searchTerms = [
      ...new Set(
        question
          .toLowerCase()
          .match(/[a-z0-9]+/g)
          ?.filter(
            (term) => term.length > 1 && !stopWords.has(term),
          ) ?? [],
      ),
    ];

    const result = await pool.query(
      `WITH query_terms AS (
          SELECT
            plainto_tsquery('english', $1) AS search_query,
            websearch_to_tsquery('english', $1) AS web_query
      ),
      matched_passages AS (
          SELECT
              d.id AS document_id,
              d.filename,
              dc.page_number,
              dc.context,
              (
                ts_rank_cd(
                  to_tsvector('english', dc.context),
                  qt.search_query
                )
                +
                ts_rank_cd(
                  to_tsvector('english', dc.context),
                  qt.web_query
                )
                +
                COALESCE((
                  SELECT COUNT(*)::real * 0.05
                  FROM unnest($2::text[]) AS term
                  WHERE dc.context ILIKE '%' || term || '%'
                ), 0)
              ) AS relevance,
              ROW_NUMBER() OVER (
                PARTITION BY
                  d.filename,
                  dc.page_number,
                  REGEXP_REPLACE(
                    LOWER(TRIM(dc.context)),
                    '\\s+',
                    ' ',
                    'g'
                  )
                ORDER BY d.created_at DESC, d.id
              ) AS duplicate_number
          FROM document_chunks dc
          JOIN documents d ON d.id = dc.document_id
          CROSS JOIN query_terms qt
          WHERE d.user_id = $3::uuid
            AND d.status = 'ready'
            AND ($4::uuid IS NULL OR d.id = $4::uuid)
            AND (
              to_tsvector('english', dc.context) @@ qt.search_query
              OR to_tsvector('english', dc.context) @@ qt.web_query
              OR EXISTS (
                SELECT 1
                FROM unnest($2::text[]) AS term
                WHERE dc.context ILIKE '%' || term || '%'
              )
            )
      )
      SELECT
          document_id,
          filename,
          page_number,
          context,
          relevance
      FROM matched_passages
      WHERE duplicate_number = 1
      ORDER BY relevance DESC, page_number ASC
      LIMIT 5`,
      [question, searchTerms, userId, documentId || null],
    );

    const results = result.rows.map((row) => ({
      documentId: row.document_id as string,
      filename: row.filename as string,
      pageNumber: Number(row.page_number),
      text: row.context as string,
      relevance: Number(row.relevance),
    }));

    const answer = await generateDocumentAnswer(
      question,
      results.map((item) => ({
        filename: item.filename,
        pageNumber: item.pageNumber,
        text: item.text,
      })),
    );

    const uniqueCitations = Array.from(
      new Map(
        results.map((item) => [
          `${item.documentId}-${item.pageNumber}`,
          {
            documentId: item.documentId,
            filename: item.filename,
            pageNumber: item.pageNumber,
          },
        ]),
      ).values(),
    );

    res.status(200).json({
      success: true,
      question,
      documentId: documentId || null,
      answer,
      resultCount: results.length,
      results,
      citations: uniqueCitations,
    });
  } catch (error) {
    console.error(
      "Document question answering failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const message = error instanceof Error ? error.message : "";

    if (message.includes("request limit reached")) {
      res.status(429).json({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message:
          "Gemini API request limit reached. Please wait before trying again.",
      });
      return;
    }

    if (message.includes("temporarily unavailable")) {
      res.status(503).json({
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message:
          "The AI service is temporarily unavailable. Please try again in a little while.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Unable to answer your question right now. Please try again.",
    });
  }
});

export default router;
