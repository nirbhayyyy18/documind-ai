import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../src/db.js", () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
  },
}));

vi.mock("../src/services/pdf.service.js", () => ({
  extractPdfPages: vi.fn(),
}));

import documentsRouter from "../src/routes/documents.routes.js";

const TEST_SECRET = "test-secret-for-documind-auth-tests-123456";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";

const app = express();
app.use(express.json());
app.use("/api/documents", documentsRouter);

function createToken() {
  return jwt.sign({}, TEST_SECRET, {
    subject: TEST_USER_ID,
    expiresIn: "1h",
  });
}

describe("Documents API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("rejects document listing without an authentication token", async () => {
    const response = await request(app).get("/api/documents");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      "Authentication token is required.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns the authenticated user's documents", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          filename: "sample.pdf",
          page_count: 3,
          status: "ready",
        },
      ],
    });

    const response = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.documents).toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        filename: "sample.pdf",
        pageCount: 3,
        status: "ready",
      },
    ]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = $1"),
      [TEST_USER_ID],
    );
  });

  it("rejects PDF upload when no file is provided", async () => {
    const response = await request(app)
      .post("/api/documents/extract")
      .set("Authorization", `Bearer ${createToken()}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Please upload a PDF file.",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
