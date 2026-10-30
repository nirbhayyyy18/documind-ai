import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

export const pool = new Pool(
  databaseUrl
    ? {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      }
    : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "documind_ai",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    }
);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});
