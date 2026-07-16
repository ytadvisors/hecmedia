#!/usr/bin/env node
/**
 * Post-deploy smoke check: hits a live preview/staging URL and asserts the
 * homepage responds with a real HEC-TV page rather than an error/blank
 * response. Intended to run against the shared staging URLs
 * (development.hecmedia.org / develop.hecmedia.org) after a preview deploy,
 * or any future per-branch preview URL, once one exists.
 *
 * Usage:
 *   node scripts/smoke-test.js [url]
 *   SMOKE_URL=https://develop.hecmedia.org node scripts/smoke-test.js
 *
 * Exit code 0 = pass, 1 = fail. No new dependencies (uses Node's built-in
 * https module) so it can run in CI without an extra install.
 */
const https = require("https");

const DEFAULT_URL = "https://development.hecmedia.org/";
const TIMEOUT_MS = 15000;

const targetUrl = process.argv[2] || process.env.SMOKE_URL || DEFAULT_URL;

const checks = [
  {
    name: "responds with HTTP 200",
    assert: res => res.statusCode === 200,
    describe: res => `got HTTP ${res.statusCode}`
  },
  {
    name: "serves HTML",
    assert: res => /text\/html/i.test(res.headers["content-type"] || ""),
    describe: res => `content-type was "${res.headers["content-type"]}"`
  },
  {
    name: "body contains the HEC-TV brand marker",
    assert: (res, body) => body.includes("HEC-TV"),
    describe: () => 'body did not contain the string "HEC-TV"'
  }
];

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: TIMEOUT_MS }, res => {
      let body = "";
      res.on("data", chunk => {
        body += chunk;
      });
      res.on("end", () => resolve({ res, body }));
    });
    req.on("timeout", () => {
      req.destroy(
        new Error(`Request to ${url} timed out after ${TIMEOUT_MS}ms`)
      );
    });
    req.on("error", reject);
  });
}

async function main() {
  console.log(`Smoke testing ${targetUrl} ...`);

  let res;
  let body;
  try {
    ({ res, body } = await get(targetUrl));
  } catch (err) {
    console.error(`FAIL: could not reach ${targetUrl} — ${err.message}`);
    process.exitCode = 1;
    return;
  }

  let failures = 0;
  checks.forEach(check => {
    const passed = check.assert(res, body);
    console.log(`${passed ? "PASS" : "FAIL"} - ${check.name}`);
    if (!passed) {
      failures += 1;
      console.error(`  ${check.describe(res, body)}`);
    }
  });

  if (failures > 0) {
    console.error(`\n${failures} smoke check(s) failed against ${targetUrl}`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll smoke checks passed against ${targetUrl}`);
  }
}

main();
