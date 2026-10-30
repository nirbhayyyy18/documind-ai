BEGIN;

-- Enable UUID generation where required.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    CONSTRAINT documents_status_check
        CHECK (status IN ('processing', 'ready', 'failed')),
    CONSTRAINT documents_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id
    ON public.documents(user_id);

-- 3. Document chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    context TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    embedding JSONB,
    CONSTRAINT document_chunks_document_id_page_number_key
        UNIQUE (document_id, page_number),
    CONSTRAINT document_chunks_document_id_fkey
        FOREIGN KEY (document_id)
        REFERENCES public.documents(id)
        ON DELETE CASCADE,
    CONSTRAINT document_chunks_page_number_check
        CHECK (page_number > 0)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON public.document_chunks(document_id);

COMMIT;