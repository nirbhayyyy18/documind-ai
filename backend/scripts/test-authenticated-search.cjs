const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

async function main() {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  if (!email || !password) {
    console.error("Test configuration is missing.");
    process.exitCode = 1;
    return;
  }

  try {
    // Step 1: Login and obtain an access token.
    const loginResponse = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const loginData = await loginResponse.json();

    console.log("Login HTTP Status:", loginResponse.status);

    if (!loginResponse.ok || typeof loginData.token !== "string") {
      console.error("Login failed. Search test cannot continue.");
      process.exitCode = 1;
      return;
    }

    console.log("Login successful:", true);

    // Step 2: Search using the access token.
    const searchResponse = await fetch(
      "http://localhost:5000/api/search?q=artificial%20intelligence",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginData.token}`,
        },
      },
    );

    const searchData = await searchResponse.json();

    console.log("Search HTTP Status:", searchResponse.status);
    console.log("Search API responded:", typeof searchData.success === "boolean");

    if (!searchResponse.ok) {
      console.error(
        "Search request failed:",
        searchData.message || searchData.error || "Unknown error",
      );
      process.exitCode = 1;
      return;
    }

    console.log("Search successful:", searchData.success === true);
    console.log("Result count:", searchData.resultCount);
    console.log("Citations returned:", Array.isArray(searchData.citations));

    if (
      searchData.success !== true ||
      !Array.isArray(searchData.results) ||
      !Array.isArray(searchData.citations)
    ) {
      console.error("Search response is missing expected fields.");
      process.exitCode = 1;
      return;
    }

    console.log("Authenticated search test passed.");
  } catch {
    console.error(
      "Could not complete the test. Check that the backend server is running.",
    );
    process.exitCode = 1;
  }
}

main();
