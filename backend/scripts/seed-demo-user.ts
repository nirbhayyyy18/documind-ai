import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../src/db";

async function seedDemoUser() {
  const name = process.env.DEMO_USER_NAME;
  const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Missing DEMO_USER_NAME, DEMO_USER_EMAIL, or DEMO_USER_PASSWORD in backend/.env",
    );
  }

  if (password.length < 12) {
    throw new Error("Demo password must be at least 12 characters long.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash
      RETURNING id, email
      `,
      [name, email, passwordHash],
    );

    const user = userResult.rows[0];

    const documentsResult = await client.query(
      `
      UPDATE documents
      SET user_id = $1
      WHERE user_id IS NULL
      `,
      [user.id],
    );

    await client.query("COMMIT");

    console.log("Demo user is ready.");
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Previously unassigned documents linked: ${documentsResult.rowCount}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seedDemoUser()
  .catch((error: unknown) => {
    console.error("Demo user seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });