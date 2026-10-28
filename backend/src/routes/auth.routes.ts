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

export default router;
