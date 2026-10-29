ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding JSONB;

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
ON document_chunks (document_id);
