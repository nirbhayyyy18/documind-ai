# 📄 DocuMind AI

**AI-powered document understanding and question-answering with source citations.**

DocuMind AI allows users to upload PDF documents, ask natural-language questions about their contents, and receive AI-generated answers grounded in relevant document passages.

The application combines PostgreSQL search, PDF text extraction, and the Google Gemini API to help users find information in their documents.

## ✨ Features

- **PDF Upload:** Upload PDF documents and extract their text.
- **Document Search:** Retrieve relevant passages using PostgreSQL full-text search and keyword matching.
- **AI-Powered Answers:** Generate context-aware answers using the Google Gemini API.
- **Source Citations:** Display supporting passages with document names and page references when available.
- **User Authentication:** Log in using the backend authentication API.
- **Protected APIs:** Require authentication for document and search operations.
- **Document Ownership:** Scope document access to the authenticated user.
- **Interactive Interface:** Upload documents, ask questions, review answers, and view supporting sources.
- **Automated Tests:** Test authentication, document routes, and search route behaviour.

## 🛠️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- CSS

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- `pg` — PostgreSQL client
- `pdf-parse` — PDF text extraction
- Google Gemini API — AI-generated answers
- JWT — Authentication tokens
- bcrypt — Password hashing

### Testing
- Vitest
- Supertest

## 📋 Prerequisites

Before running the application, install or configure:

- Node.js and npm
- PostgreSQL
- A Google Gemini API key
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nirbhayyyy18/documind-ai.git
cd documind-ai
```

### 2. Configure PostgreSQL

Create a PostgreSQL database named `documind_ai`:

```sql
CREATE DATABASE documind_ai;
```

Ensure PostgreSQL is running and that your database credentials are correct.

Apply the SQL migration files provided in the `backend/migrations/` directory in the appropriate order. These migrations establish the database structure required by the application, including authentication and document ownership.

### 3. Configure Environment Variables

Copy the root `.env.example` file into `backend/.env`.

From the project root, run:

```powershell
Copy-Item .env.example backend/.env
```

Open `backend/.env` and replace the placeholder values with your own local PostgreSQL credentials and Gemini API key.

The configuration includes:

| Variable | Purpose |
|---|---|
| `DB_HOST` | PostgreSQL server hostname |
| `DB_PORT` | PostgreSQL server port |
| `DB_NAME` | Database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `GEMINI_API_KEY` | Google Gemini API key |

Use a randomly generated JWT secret with at least 32 characters.

**Security:** Never commit `.env` files, database passwords, JWT secrets, or API keys to GitHub.

### 4. Install and Run the Backend

Open a terminal in the project root:

```powershell
cd backend
npm install
npm run dev
```

The backend should run at:

`http://localhost:5000`

Keep this terminal running.

### 5. Install and Run the Frontend

Open a second terminal in the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the application in your browser:

`http://localhost:3000`

Keep both development servers running while using the application.

## 🔄 How It Works

1. The user logs in through the application.
2. The user uploads a PDF document.
3. The backend extracts text and processes the document.
4. Document information is stored in PostgreSQL.
5. The user asks a question about the available documents.
6. The backend retrieves relevant passages using PostgreSQL search.
7. Retrieved passages are supplied as context to the Gemini API.
8. The application displays the generated answer and supporting source references.

## 🔌 API Overview

The backend exposes the following primary endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend health |
| `POST` | `/api/auth/login` | Authenticate a user and obtain a token |
| `GET` | `/api/documents` | Retrieve the authenticated user's documents |
| `POST` | `/api/documents/extract` | Upload and extract text from a PDF |
| `GET` | `/api/search?q=your-question` | Search document content and generate an answer |

Protected document and search endpoints require a valid authentication token.

Include the token in the request header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

Refer to the backend route implementations for the precise request formats and response structures.

## 🧪 Running Automated Tests

From the backend directory, run:

```powershell
npm test
```

The automated test suite covers authentication middleware, login validation, document routes, and search routes.

The current suite contains 18 tests across four test files.

## 🔐 Security and Limitations

- Keep API keys and database credentials in environment variables.
- Protected endpoints require authentication.
- Document queries are scoped to the authenticated user.
- AI-generated answers may contain errors; verify important information against the cited passages.
- Answer quality depends on PDF text extraction and the relevance of retrieved passages.
- Gemini API availability and usage limits may affect answer generation.
- The current document workflow focuses on PDFs.
- Search currently uses PostgreSQL full-text search and keyword matching; this is not the same as vector-based semantic search.

## 🎯 Project Goal

DocuMind AI aims to make document analysis faster and more accessible by allowing users to ask natural-language questions and receive AI-generated answers supported by relevant document passages.

## 👨‍💻 Author

**Nirbhay Tiwari**

Built with Next.js, Express.js, PostgreSQL, and Google Gemini.