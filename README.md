# DocuMind AI 📄

**AI-powered document understanding and question answering with source citations.**

DocuMind AI lets users upload PDF documents, ask questions in natural language, and receive AI-generated answers grounded in relevant document passages.

The application combines PDF text extraction, PostgreSQL, local Ollama embeddings, hybrid retrieval, and Google Gemini to make document analysis easier and more transparent.

## ✨ Features

- **PDF Upload and Extraction:** Upload PDF files and extract their text.
- **Document Chunking:** Retrieve relevant document passages with page references.
- **Semantic Search:** Generate embeddings using the `nomic-embed-text` model through Ollama.
- **Keyword Search:** Search document content using PostgreSQL full-text search and keyword matching.
- **Hybrid Retrieval:** Combine semantic and keyword rankings using Reciprocal Rank Fusion (RRF).
- **AI-Powered Answers:** Generate answers using the Google Gemini API.
- **Source Citations:** Return supporting passages with document filenames and page numbers.
- **User Authentication:** Register and log in using authenticated backend APIs.
- **Document Ownership:** Restrict document listing and retrieval to the authenticated user.
- **Protected APIs:** Require authentication for document and search operations.
- **Automated Tests:** Test authentication, document routes, and search behaviour.

## 🧰 Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- `pg`
- `pdf-parse`
- Google Gemini API (`@google/genai`)
- Ollama embeddings
- JSON Web Tokens (JWT)
- bcrypt

### Testing
- Vitest
- Supertest

## 📋 Prerequisites

Install or configure the following before running the application:

- Node.js and npm
- PostgreSQL
- Ollama
- The `nomic-embed-text` Ollama model
- A Google Gemini API key
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nirbhayyyy18/documind-ai.git
cd documind-ai
```

### 2. Set Up PostgreSQL

Create a database named `documind_ai`:

```sql
CREATE DATABASE documind_ai;
```

Ensure PostgreSQL is running and that the database credentials are correct.

Apply the SQL migrations in `backend/migrations/` in numerical order:

1. `001_auth_and_document_ownership.sql`
2. `002_add_chunk_embeddings.sql`

**Note:** The initial database schema required by the application must exist before applying migrations that alter existing tables. If you have an existing database, back it up before making schema changes.

### 3. Configure Environment Variables

From the project root, create the backend environment file using the example:

```powershell
Copy-Item .env.example backend/.env
```

Open `backend/.env` and replace the placeholder values with your own configuration.

| Variable | Purpose |
|---|---|
| `DB_HOST` | PostgreSQL server hostname |
| `DB_PORT` | PostgreSQL server port |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OLLAMA_BASE_URL` | Ollama server URL, usually `http://127.0.0.1:11434` |

Use a randomly generated JWT secret with at least 32 characters.

**Security:** Never commit `.env` files, database credentials, JWT secrets, or API keys to GitHub.

### 4. Set Up Ollama

Start Ollama and download the embedding model:

```powershell
ollama pull nomic-embed-text
```

Confirm that the model is available:

```powershell
ollama list
```

The embedding service uses the Ollama `/api/embed` endpoint. By default, it connects to:

```text
http://127.0.0.1:11434
```

Set `OLLAMA_BASE_URL` in `backend/.env` if your Ollama server uses a different address.

### 5. Install and Run the Backend

Open a terminal in the project root:

```powershell
cd backend
npm install
npm run dev
```

The backend should run at:

```text
http://localhost:5000
```

Keep the backend terminal running.

### 6. Install and Run the Frontend

Open a second terminal in the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

Keep both development servers running while using the application.

## 🔍 How It Works

1. The user registers or logs in.
2. The application authenticates the user and protects document-related API operations.
3. The user uploads a PDF document.
4. The backend extracts and processes the document text.
5. Document information and passages are stored in PostgreSQL.
6. Ollama generates embeddings for document passages and user questions.
7. Semantic retrieval ranks passages by cosine similarity.
8. PostgreSQL full-text search and keyword matching retrieve relevant passages independently.
9. Reciprocal Rank Fusion (RRF) combines the semantic and keyword result rankings.
10. Relevant passages are supplied to Google Gemini as context.
11. The application returns the generated answer and supporting source references.

Semantic retrieval is optional at query time: if embedding generation or semantic retrieval fails, the route continues with keyword search.

## 🔌 API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend health |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Authenticate a user |
| `GET` | `/api/documents` | List the authenticated user's documents |
| `POST` | `/api/documents/extract` | Upload and extract text from a PDF |
| `GET` | `/api/search?q=your-question` | Search document content and generate an answer |

Protected document and search endpoints require a valid authentication token.

Example authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The search endpoint accepts a `q` query parameter. It can also accept a `documentId` parameter to restrict the search to a specific document.

Search questions must be no longer than 500 characters.

Refer to the backend route implementations for the exact request formats and response structures.

## 🧪 Running Automated Tests

From the backend directory, run:

```powershell
npm test
```

To run TypeScript type checking:

```powershell
npx tsc --noEmit
```

The test suite covers authentication middleware, authentication routes, document routes, and search behaviour.

The test count may change as additional tests are added.

## 🧩 Backfilling Embeddings

The backend includes a script to generate embeddings for document chunks whose `embedding` value is currently `NULL`.

Before running it, ensure PostgreSQL and Ollama are running, the `nomic-embed-text` model is available, and `backend/.env` is configured.

From the backend directory, run:

```powershell
npx tsx src/scripts/backfill-embeddings.ts
```

The script reports successful and failed chunks. Review the output before relying on semantic retrieval for previously uploaded documents.

## 🔐 Security and Limitations

- Keep API keys and database credentials in environment variables.
- Protected endpoints require authentication.
- Document queries are scoped to the authenticated user.
- AI-generated answers can contain errors; verify important information against the cited passages.
- Answer quality depends on PDF extraction and passage retrieval.
- Gemini API availability, quota, and usage limits can affect answer generation.
- Semantic search requires Ollama and the embedding model.
- The current document workflow focuses on PDFs.
- Document ownership and access to existing records should be verified when migrating an existing database.

## 🎯 Project Goal

DocuMind AI aims to make document analysis faster and more accessible by allowing users to ask natural-language questions and receive AI-generated answers supported by relevant document passages.

## 👨‍💻 Author

**Nirbhay Tiwari**

Built with Next.js, Express.js, PostgreSQL, Ollama, and Google Gemini.