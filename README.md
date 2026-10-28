📄 DocuMind AI

AI-powered document understanding and question-answering system with source citations.

DocuMind AI allows users to upload PDF documents, ask questions about their contents, and receive AI-generated answers grounded in relevant document passages. It retrieves supporting text from uploaded documents to help users verify the answers.

✨ Features

📤 PDF Upload: Upload PDF documents for text extraction and processing.

🔍 Document Search: Search document content using PostgreSQL full-text search and keyword matching.

🤖 AI-Powered Answers: Generate context-aware answers using the Google Gemini API.

📚 Source Citations: Display relevant source passages with document names and page references.

🛡️ Grounded Responses: Help users verify answers against retrieved document content and identify information that is not specified in a document.

⚡ Interactive Interface: Ask questions and view answers, retrieved passages, and citations through a Next.js web interface.

🛠️ Tech Stack

Frontend

Next.js

React

TypeScript

CSS

Backend

Node.js

Express.js

TypeScript

PostgreSQL

pg — PostgreSQL client

pdf-parse — PDF text extraction

Google Gemini API — AI-generated answers

⚙️ Prerequisites

Before running the project, ensure you have:

Node.js and npm installed.

PostgreSQL installed and running.

A Google Gemini API key.

🚀 Getting Started

1. Clone the Repository

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd documind-ai

Replace <YOUR_GITHUB_REPOSITORY_URL> with your actual GitHub repository URL.

2. Set Up the Database

Create a PostgreSQL database named documind_ai.

CREATE DATABASE documind_ai;

Ensure the database credentials in your backend environment configuration match your local PostgreSQL setup.

The required database tables must be created before using document upload and search functionality.

3. Configure the Backend

Navigate to the backend directory:

cd backend
npm install

Create a .env file inside backend/ with the following variables:

PORT=5000
DATABASE_URL=postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:5432/documind_ai
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

Replace the placeholder values with your own database credentials and Gemini API key.

Important: Never commit your .env file or expose your API key publicly.

Start the backend development server:

npm run dev

The backend API should be available at:

http://localhost:5000

4. Set Up the Frontend

Open a second terminal from the project root:

cd frontend
npm install

Start the frontend development server:

npm run dev

Open the application in your browser:

http://localhost:3000

Keep the backend and frontend development servers running while using the application.

💡 How It Works

Upload a PDF document through the web interface.

The backend extracts text from the uploaded PDF.

The extracted document content is stored and made searchable.

Enter a question about the uploaded document.

The backend searches for relevant passages in PostgreSQL.

Relevant passages are supplied as context to the Gemini API.

The application displays the generated answer and supporting source references.

🔌 API Overview

Method

Endpoint

Purpose

GET

/api/health

Check backend health

POST

/api/documents/extract

Upload and extract PDF text

GET

/api/search?q=your-question

Search document content and generate an answer

🔐 Security and Limitations

API keys and database credentials must be stored in environment variables.

Answers depend on the quality of the extracted text and the relevance of retrieved passages.

AI-generated answers may not always be correct; verify important information against the cited source.

API usage limits may affect answer generation.

The project currently focuses on PDF documents.

🎯 Project Goal

The goal of DocuMind AI is to make document analysis faster and more accessible by allowing users to ask natural-language questions and receive answers supported by relevant passages from their own documents.

👨‍💻 Author

Nirbhay Tiwari

Built with Next.js, Express.js, PostgreSQL, and Google Gemini.