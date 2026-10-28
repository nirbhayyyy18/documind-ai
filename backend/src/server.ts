import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import authRouter from "./routes/auth.routes.js";

import documentsRouter from "./routes/documents.routes.js";
import searchRouter from "./routes/search.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/documents", documentsRouter);
app.use("/api/search", searchRouter);
app.use("/api/auth", authRouter);
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.status(200).json({
      success: true,
      message: "DocuMind AI API is running",
      database: "connected",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "API is running, but database connection failed",
      database: "disconnected",
    });
  }
});

app.listen(PORT, () => {
  console.log(`DocuMind AI API running on http://localhost:${PORT}`);
});