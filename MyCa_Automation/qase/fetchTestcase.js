import "dotenv/config";
  import fetch from "node-fetch";
import fs from "fs";

const QASE_TOKEN = process.env.QASE_API_TOKEN;
const PROJECT_CODE = "HOSP";     // your project
const TEST_CASE_ID = 1;          // test case number

const url = `https://api.qase.io/v1/case/${PROJECT_CODE}/${TEST_CASE_ID}`;

const response = await fetch(url, {
  headers: {
    "Token": QASE_TOKEN
  }
});

const data = await response.json();

// Save locally so Copilot can read it
fs.writeFileSync(
  `./qase/TC-${TEST_CASE_ID}.json`,
  JSON.stringify(data.result, null, 2)
);

console.log("Test case fetched successfully");
