import "dotenv/config";
import { pool } from "../db.js";
import { generateEmbedding } from "../services/embedding.service.js";

async function backfillEmbeddings() {
  let processed = 0;
  let failed = 0;

  try {
    const result = await pool.query<{
      id: string;
      filename: string;
      page_number: number;
      context: string;
    }>(
      `SELECT
         dc.id,
         d.filename,
         dc.page_number,
         dc.context
       FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE dc.embedding IS NULL
       ORDER BY d.filename, dc.page_number, dc.id`,
    );

    console.log(`Found ${result.rows.length} chunks without embeddings.`);

    for (const chunk of result.rows) {
      try {
        const embedding = await generateEmbedding(chunk.context);

        const updateResult = await pool.query(
          `UPDATE document_chunks
           SET embedding = $1::jsonb
           WHERE id = $2
             AND embedding IS NULL`,
          [JSON.stringify(embedding), chunk.id],
        );

        if (updateResult.rowCount === 1) {
          processed++;
          console.log(
            `[${processed + failed}/${result.rows.length}] Embedded: ${chunk.filename}, page ${chunk.page_number}`,
          );
        } else {
          console.log(
            `Skipped already-updated chunk: ${chunk.filename}, page ${chunk.page_number}`,
          );
        }
      } catch (error) {
        failed++;
        console.error(
          `Failed: ${chunk.filename}, page ${chunk.page_number}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log("\nBackfill finished.");
    console.log(`Successfully embedded: ${processed}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error(
      "Backfill could not complete:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void backfillEmbeddings();
