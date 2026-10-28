import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Response, NextFunction } from "express";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../src/middleware/auth.middleware";

const TEST_SECRET = "test-secret-for-documind-auth-tests-123456";

function createMocks(authorization?: string) {
  const req = {
    headers: authorization ? { authorization } : {},
  } as AuthenticatedRequest;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as unknown as NextFunction;

  return { req, res, next };
}

describe("authenticateToken middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JWT_SECRET;
  });

  it("returns 401 when the authorization header is missing", () => {
    const { req, res, next } = createMocks();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication token is required.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the Bearer token is empty", () => {
    const { req, res, next } = createMocks("Bearer ");

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Authentication token is required.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is invalid", () => {
    const { req, res, next } = createMocks("Bearer invalid-token");

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired authentication token.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token has expired", () => {
    const token = jwt.sign(
      { sub: "user-123" },
      TEST_SECRET,
      { expiresIn: -1 },
    );
    const { req, res, next } = createMocks(`Bearer ${token}`);

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired authentication token.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token and sets the user ID", () => {
    const token = jwt.sign(
      { sub: "user-123" },
      TEST_SECRET,
      { expiresIn: "1h" },
    );
    const { req, res, next } = createMocks(`Bearer ${token}`);

    authenticateToken(req, res, next);

    expect(req.userId).toBe("user-123");
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
