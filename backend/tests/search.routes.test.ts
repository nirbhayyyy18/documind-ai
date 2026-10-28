import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const { mockQuery, mockGenerateAnswer } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockGenerateAnswer: vi.fn(),
}));

vi.mock("../src/db.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock("../src/services/answer.service.js", () => ({
  generateDocumentAnswer: mockGenerateAnswer,
}));

import searchRouter from "../src/routes/search.routes.js";

const TEST_SECRET = "test-secret-for-documind-auth-tests-123456";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";

const app = express();
app.use(express.json());
app.use("/api/search", searchRouter);

function createToken() {
  return jwt.sign({}, TEST_SECRET, {
    subject: TEST_USER_ID,
    expiresIn: "1h",
  });
}

describe("Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("rejects search requests without an authentication token", async () => {
    const response = await request(app)
      .get("/api/search")
      .query({ q: "company revenue" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      "Authentication token is required.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when the question is missing", async () => {
    const response = await request(app)
      .get("/api/search")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Please provide a search question using the q parameter.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when the question exceeds 500 characters", async () => {
    const response = await request(app)
      .get("/api/search")
      .set("Authorization", `Bearer ${createToken()}`)
      .query({ q: "a".repeat(501) });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "The search question must be 500 characters or fewer.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when the document ID is invalid", async () => {
    const response = await request(app)
      .get("/api/search")
      .set("Authorization", `Bearer ${createToken()}`)
      .query({
        q: "company revenue",
        documentId: "not-a-valid-uuid",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Please provide a valid document ID.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns search results, an AI answer and citations", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          document_id: TEST_DOCUMENT_ID,
          filename: "annual-report.pdf",
          page_number: 2,
          context: "The company's revenue increased by 20%.",
          relevance: 0.95,
        },
      ],
    });

    mockGenerateAnswer.mockResolvedValueOnce(
      "The company's revenue increased by 20%.",
    );

    const response = await request(app)
      .get("/api/search")
      .set("Authorization", `Bearer ${createToken()}`)
      .query({ q: "company revenue" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.answer).toBe(
      "The company's revenue increased by 20%.",
    );
    expect(response.body.resultCount).toBe(1);
    expect(response.body.results[0]).toMatchObject({
      documentId: TEST_DOCUMENT_ID,
      filename: "annual-report.pdf",
      pageNumber: 2,
    });
    expect(response.body.citations).toEqual([
      {
        documentId: TEST_DOCUMENT_ID,
        filename: "annual-report.pdf",
        pageNumber: 2,
      },
    ]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("d.user_id = $3::uuid"),
      ["company revenue", ["company", "revenue"], TEST_USER_ID, null],
    );

    expect(mockGenerateAnswer).toHaveBeenCalledOnce();
  });
});
