import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

router.post("/login", async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error: "Please provide a valid email and password.",
    });
    return;
  }

  const email = validation.data.email.toLowerCase();
  const password = validation.data.password;

  try {
    const result = await pool.query(
      `SELECT id, email, name, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      console.error("JWT_SECRET is missing or too short.");
      res.status(500).json({ error: "Authentication is not configured." });
      return;
    }

    const token = jwt.sign({}, secret, {
      subject: user.id,
      expiresIn: "2h",
      issuer: "documind-ai",
      audience: "documind-ai-client",
    });

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "Login failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(500).json({ error: "Unable to process login right now." });
  }
});

router.post("/register", async (req, res) => {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error:
        "Please provide a valid name, email, and password of at least 8 characters.",
    });
    return;
  }

  const name = validation.data.name;
  const email = validation.data.email.toLowerCase();
  const password = validation.data.password;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email`,
      [name, email, passwordHash],
    );

    if (result.rows.length === 0) {
      res.status(409).json({
        error: "An account with this email already exists.",
      });
      return;
    }

    res.status(201).json({
      message: "Registration successful. Please sign in.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Registration failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(500).json({
      error: "Unable to create your account right now.",
    });
  }
});

export default router;
