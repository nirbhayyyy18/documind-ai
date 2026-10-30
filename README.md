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

For a fresh database, apply `backend/migrations/000_initial_schema.sql` first. This migration creates the `users`, `documents`, and `document_chunks` tables with their required columns, constraints, and indexes.

The files `001_auth_and_document_ownership.sql` and `002_add_chunk_embeddings.sql` are incremental migrations for an older database schema. Do not run them automatically after the initial schema migration on a fresh database.

If you are upgrading an existing database, back it up first and verify which migrations have already been applied before making schema changes.

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
| `DEMO_USER_NAME` | Name for the optional demo account |
| `DEMO_USER_EMAIL` | Email address for the demo account |
| `DEMO_USER_PASSWORD` | Demo account password (at least 12 characters) |

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

## Demo Account Setup

The project includes a seed script to create or update a demo user for local evaluation.

### 1. Configure Demo Credentials

Set the following variables in `backend/.env`:

```env
DEMO_USER_NAME=DocuMind Demo
DEMO_USER_EMAIL=demo@example.com
DEMO_USER_PASSWORD=your_demo_password_at_least_12_chars
```

Replace the password placeholder with a password of your choice that is at least 12 characters long. These credentials are intended for local development and evaluation only.

### 2. Create the Demo User

From the project root, run:

```powershell
cd backend
npm run seed
```

The script creates or updates the demo account and assigns existing documents without an owner to that account.

### 3. Sign In

Start the backend and frontend, then open `http://localhost:3000`.

Sign in with the email and password configured in `backend/.env`.

**Note:** The seed script creates the demo account but does not create sample PDF documents. Upload a PDF after signing in to test document extraction, search, answers, and citations.

## Database Design

DocuMind AI uses PostgreSQL to store user accounts, uploaded document metadata, and extracted document chunks.

### Main Tables

| Table | Purpose |
|---|---|
| `users` | Stores registered user information and authentication-related data. |
| `documents` | Stores document metadata, ownership information, and processing status. |
| `document_chunks` | Stores extracted document passages, page references, and embeddings used for retrieval. |

### Relationships

- **Users → Documents:** A user can own multiple documents. Each document can be associated with a user.
- **Documents → Document Chunks:** A document can contain multiple extracted chunks.
- **Document Ownership:** Document listing and search operations are scoped to the authenticated user.

### Design Decisions

**PostgreSQL:** Provides persistent relational storage and supports full-text search.

**Page-aware chunking:** Extracted text is divided into smaller passages while retaining page references, allowing answers to cite their sources.

**Local embeddings with Ollama:** The `nomic-embed-text` model generates embeddings locally, reducing reliance on an external embedding API.

**Hybrid retrieval:** Semantic similarity helps retrieve conceptually relevant passages, while keyword search helps find passages containing specific terms.

**Reciprocal Rank Fusion (RRF):** Combines the rankings from semantic and keyword retrieval without requiring both methods to produce scores on the same scale.

**Grounded answer generation:** Retrieved passages are supplied to the language model as context, and the application returns supporting document citations. Questions that cannot be answered from the retrieved content should receive an appropriate no-answer response.

**Authentication and authorization:** Protected endpoints use JWT authentication, and document access is restricted on the backend rather than relying only on frontend filtering.


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

## Implementation Status

### Implemented Features

- User registration and login using JWT authentication.
- PDF upload and text extraction.
- Document chunking with page references.
- Embedding generation using Ollama and `nomic-embed-text`.
- Semantic search using embedding similarity.
- PostgreSQL full-text and keyword search.
- Hybrid retrieval using Reciprocal Rank Fusion (RRF).
- AI-generated answers using the Google Gemini API.
- Source citations with document filenames and page numbers.
- Document ownership checks for protected document and search operations.
- Fallback to keyword retrieval when semantic retrieval is unavailable.
- Backend automated tests for authentication, document routes, and search functionality.
- A seed script for creating a demo account.

### Known Limitations

- PDF extraction quality depends on the structure and content of the uploaded file.
- Scanned PDFs may require OCR support if their text cannot be extracted directly.
- Semantic search depends on Ollama and the configured embedding model.
- Answer generation depends on Google Gemini API availability and usage limits.
- The current upload workflow processes document content during the upload request rather than using a separate background job queue.
- The seed script creates a demo user but does not generate sample documents automatically.

### Future Improvements

Given more development time, the following improvements would be valuable:

1. **Background document processing:** Process large PDFs asynchronously and provide reliable processing-status updates.
2. **OCR support:** Extract text from scanned PDFs and image-based documents.
3. **Persistent chat history:** Store conversations and allow users to revisit previous questions and answers.
4. **Improved PDF viewer:** Highlight the exact cited passage in the document viewer.
5. **Performance and scalability:** Add background workers, caching, and optimized retrieval for larger document collections.
6. **Expanded testing:** Add more integration tests, authorization edge cases, and tests for PDF processing failures.
7. **Deployment:** Deploy the frontend and backend with a securely configured production database and environment variables.

These are proposed improvements and should not be interpreted as features already implemented.

## AI Tools Used

AI-assisted development tools may be used during development to support implementation, debugging, and documentation.

### Google Gemini API
- Generates answers to user questions using retrieved document passages as context.
- Helps produce responses grounded in the uploaded documents.

### Ollama — `nomic-embed-text`
- Generates vector embeddings for document passages and search queries.
- Supports semantic retrieval of relevant content.

### Development Assistance
AI coding assistants may be used to help understand errors, troubleshoot implementation issues, review code, and improve documentation. The final implementation should be tested and reviewed by the developer.

AI-generated answers may occasionally be inaccurate, so users should verify important information against the cited source passages.

## 🎯 Project Goal

DocuMind AI aims to make document analysis faster and more accessible by allowing users to ask natural-language questions and receive AI-generated answers supported by relevant document passages.

## 👨‍💻 Author

**Nirbhay Tiwari**

Built with Next.js, Express.js, PostgreSQL, Ollama, and Google Gemini.