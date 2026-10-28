const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  if (!email || !password) {
    console.error("Test configuration is missing.");
    process.exitCode = 1;
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    console.log("HTTP Status:", response.status);
    console.log("Login successful:", response.ok && typeof data.token === "string");
    console.log("User returned:", Boolean(data.user?.id && data.user?.email));

    if (!response.ok) {
      console.error("Login test failed. API returned an error.");
      process.exitCode = 1;
    }
  } catch {
    console.error("Could not reach the API. Check that the backend server is running.");
    process.exitCode = 1;
  }
}

main();
