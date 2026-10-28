"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  documentId: string;
  filename: string;
  pageNumber: number;
  text: string;
  relevance: number;
};

type UploadedDocument = {
  id: string;
  filename: string;
  pageCount: number;
  status: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("all");
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [answer, setAnswer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError("");
  setMessage("");

  if (!loginEmail.trim() || !loginPassword) {
    setError("Please enter your email and password.");
    return;
  }

  setLoggingIn(true);

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: loginEmail.trim(),
        password: loginPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.token || !data.user) {
      throw new Error(data.error || data.message || "Login failed.");
    }

    setToken(data.token);
    setCurrentUser(data.user);
    setLoginPassword("");
    setMessage(`Welcome, ${data.user.name}!`);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to log in.",
    );
  } finally {
    setLoggingIn(false);
  }
}

  useEffect(() => {
  let cancelled = false;

  if (!token) {
    return;
  }

  async function loadDocuments() {
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load documents.");
      }

      if (!cancelled) {
        setDocuments(data.documents as UploadedDocument[]);
      }
    } catch (err) {
      if (!cancelled) {
        console.error("Failed to load documents:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load existing documents.",
        );
      }
    }
  }

  void loadDocuments();

  return () => {
    cancelled = true;
  };
}, [token]);

  async function handleUpload() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The PDF must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    setResults([]);
    setAnswer("");
    setDocument(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/documents/extract`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to upload the document.");
      }

      setDocument(data.document);

      setDocuments((previous) => {
        const updated = [
          data.document,
          ...previous.filter((item) => item.id !== data.document.id),
        ];

        return updated;
      });

      setSelectedDocumentId(data.document.id);

      setMessage(
        `Successfully processed ${data.document.pageCount} page(s). You can now ask questions.`,
      );

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    setSearching(true);
    setError("");
    setMessage("");
    setResults([]);
    setAnswer("");

    try {

      const params = new URLSearchParams({ q: question.trim() });

      if (selectedDocumentId !== "all") {
        params.append("documentId", selectedDocumentId);
      }

      const response = await fetch(
        `${API_URL}/api/search?${params.toString()}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to search documents.");
      }

      setResults(data.results);
      setAnswer(data.answer || "");

      if (data.results.length === 0) {
        setMessage(
          "No relevant passages found. Try using keywords from your document.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while searching.",
      );
    } finally {
      setSearching(false);
    }
  }

  // Display each document-page citation only once.
  const uniqueCitations = Array.from(
    new Map(
      results.map((result) => [
        `${result.filename.toLowerCase()}-${result.pageNumber}`,
        result,
      ]),
    ).values(),
  );

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
            {!token ? (
        <section className="flex min-h-screen items-center justify-center px-5 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">
              D
            </div>

            <h2 className="text-2xl font-bold tracking-tight">
              Welcome to DocuMind AI
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to upload documents and ask questions about your PDFs.
            </p>

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Secure access to your personal document workspace.
            </p>
          </div>
        </section>
      ) : (
        <>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              D
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                DocuMind AI
              </h1>

              <p className="text-xs text-slate-500">
                Document intelligence workspace
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                {currentUser?.name || "User"}
              </p>
              <p className="text-xs text-slate-500">
                {currentUser?.email || ""}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Workspace ready
            </div>

            <button
              type="button"
              onClick={() => {
                setToken(null);
                setCurrentUser(null);
                setDocuments([]);
                setDocument(null);
                setResults([]);
                setAnswer("");
                setQuestion("");
                setSelectedDocumentId("all");
                setError("");
                setMessage("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <span>✦</span>
            YOUR AI DOCUMENT ASSISTANT
          </div>

          <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your documents.
            <span className="block text-indigo-600">
              Your questions. Clear answers.
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Upload a PDF, search its contents, and find relevant passages
            with page-level citations. Everything starts with your document.
          </p>
        </section>

        {(error || message) && (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* PDF Upload Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                📄
              </div>

              <div>
                <h3 className="text-lg font-bold">Upload a document</h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add a PDF to make its content searchable.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                ↑
              </span>

              <span className="text-sm font-semibold text-slate-800">
                Click to select your PDF
              </span>

              <span className="mt-2 text-xs text-slate-500">
                PDF format · Maximum size 10 MB
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setError("");
                setMessage("");
              }}
            />

            {file && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Remove
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {uploading ? "Processing document..." : "Upload and process PDF"}
              {!uploading && <span>→</span>}
            </button>

            {document && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">✓</span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900">
                      Document processed successfully
                    </p>

                    <p className="mt-1 wrap-break-word text-sm text-emerald-800">
                      {document.filename}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800">
                        {document.pageCount} page(s)
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-emerald-800">
                        {document.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs leading-6 text-slate-500">
                Your PDF is processed by the backend and its extracted page
                text is stored in PostgreSQL for retrieval.
              </p>
            </div>
          </section>

          {/* Question and Search Results Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                ✧
              </div>

              <div>
                <h3 className="text-lg font-bold">Ask your document</h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Ask a question and discover matching passages.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch}>
              <label
                htmlFor="documentSelector"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search in document
              </label>

              <select
                id="documentSelector"
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                className="mb-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              >
                <option value="all">All Documents</option>

                {documents.map((item) => {
                  const sameNameDocuments = documents.filter(
                    (doc) => doc.filename === item.filename,
                  );

                  const documentIndex = sameNameDocuments.findIndex(
                    (doc) => doc.id === item.id,
                  );

                  const label =
                    sameNameDocuments.length > 1
                      ? `${item.filename} (Document ${documentIndex + 1})`
                      : item.filename;

                  return (
                    <option key={item.id} value={item.id}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <label
                htmlFor="question"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                What would you like to know?
              </label>

              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder="e.g. What is the final goal of the AI sales bot?"
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Ask questions about your uploaded documents</span>
                <span>{question.length}/500</span>
              </div>

              <button
                type="submit"
                disabled={searching || !question.trim()}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {searching ? "Searching documents..." : "Find relevant passages"}
                {!searching && <span>⌕</span>}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-bold">Retrieved passages</h4>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {results.length} found
                </span>
              </div>

              {/* Answer Summary and Unique Citations */}
              {answer && results.length > 0 && (
                <section className="mb-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold tracking-wide text-white">
                      SEARCH SUMMARY
                    </span>

                    <h5 className="text-base font-bold text-slate-900">
                      Relevant information found
                    </h5>
                  </div>

                  <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-slate-700">
                    {answer}
                  </p>

                  <div className="mt-4 border-t border-indigo-200 pt-3">
                    <h6 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Source citations
                    </h6>

                    <div className="flex flex-wrap gap-2">
                      {uniqueCitations.map((result) => (
                        <span
                          key={`${result.documentId}-${result.pageNumber}`}
                          className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        >
                          📄 {result.filename} · Page {result.pageNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <div className="mb-3 text-2xl">⌕</div>

                  <p className="text-sm font-medium text-slate-700">
                    Your search results will appear here
                  </p>

                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">
                    Upload a document if needed, enter a question, and search
                    to retrieve relevant text with source information.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <article
                      key={`${result.documentId}-${result.pageNumber}-${index}`}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          Source · Page {result.pageNumber}
                        </span>

                        <span className="text-xs text-slate-400">
                          Relevance Score: {result.relevance.toFixed(3)}
                        </span>
                      </div>

                      <p className="mb-3 wrap-break-word text-xs font-medium text-slate-500">
                        {result.filename}
                      </p>

                      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-slate-700">
                        {result.text}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="text-xs font-medium text-indigo-700">
                          Citation: {result.filename}, page {result.pageNumber}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row">
          <p>DocuMind AI · Document Q&A with Citations</p>
          <p>Built with Next.js, Express and PostgreSQL</p>
        </footer>
      </div>
        </>
      )}
      </main>
  );
}
