BEGIN;

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add ownership to existing documents
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Add a foreign key to link documents with users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_user_id_fkey'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Index for faster user-specific document queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id
ON documents(user_id);

COMMIT;