import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const { mockQuery, mockCompare, mockHash } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));

vi.mock("../src/db.js", () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: mockCompare,
    hash: mockHash,
  },
}));

import authRouter from "../src/routes/auth.routes.js";

const TEST_SECRET = "test-secret-for-documind-auth-tests-123456";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("returns 400 for an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid-email", password: "password123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Please provide a valid email and password.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when the password is missing", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Please provide a valid email and password.",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 401 when the user does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.com", password: "password123" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password.");
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns 401 when the password is incorrect", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        email: "demo@example.com",
        name: "Demo User",
        password_hash: "mock-password-hash",
      }],
    });
    mockCompare.mockResolvedValueOnce(false);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@example.com", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password.");
  });

  it("returns a JWT and user details for valid credentials", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        email: "demo@example.com",
        name: "Demo User",
        password_hash: "mock-password-hash",
      }],
    });
    mockCompare.mockResolvedValueOnce(true);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "DEMO@example.com", password: "correct-password" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful.");
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Demo User",
      email: "demo@example.com",
    });

    const decoded = jwt.verify(response.body.token, TEST_SECRET, {
      issuer: "documind-ai",
      audience: "documind-ai-client",
    });

    expect(typeof decoded).not.toBe("string");
    expect((decoded as jwt.JwtPayload).sub).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("returns 400 for an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Demo User",
        email: "invalid-email",
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });

  it("returns 400 for a password shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Demo User",
        email: "demo@example.com",
        password: "short",
      });

    expect(response.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });

  it("creates a user with a hashed password", async () => {
    mockHash.mockResolvedValueOnce("secure-mock-hash");

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Demo User",
          email: "demo@example.com",
        },
      ],
    });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Demo User",
        email: "DEMO@example.com",
        password: "password123",
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Registration successful. Please sign in.",
    );

    expect(mockHash).toHaveBeenCalledWith("password123", 12);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      ["Demo User", "demo@example.com", "secure-mock-hash"],
    );

    expect(response.body.user).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Demo User",
      email: "demo@example.com",
    });

    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.password_hash).toBeUndefined();
    expect(response.body.token).toBeUndefined();
  });

  it("returns 409 when the email already exists", async () => {
    mockHash.mockResolvedValueOnce("secure-mock-hash");
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Demo User",
        email: "demo@example.com",
        password: "password123",
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      "An account with this email already exists.",
    );
  });

  it("returns 500 when the database operation fails", async () => {
    mockHash.mockResolvedValueOnce("secure-mock-hash");
    mockQuery.mockRejectedValueOnce(new Error("Database unavailable"));

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Demo User",
        email: "demo@example.com",
        password: "password123",
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe(
      "Unable to create your account right now.",
    );
  });
});