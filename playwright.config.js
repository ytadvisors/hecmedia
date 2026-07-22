/**
 * Playwright config for the client mock-parity acceptance suite.
 *
 * This suite drives a real browser against the DEPLOYED staging site — it is
 * deliberately not a unit-test layer. See tests/acceptance/mock-parity.spec.js
 * for why, and MOCK-GAP-SPEC.md for the audit that produced it.
 *
 * Runs on worker-mba (browser work stays off the iMac orchestrator), which
 * already has Chrome and the cached Playwright browsers. `channel: "chrome"`
 * uses the installed Chrome rather than downloading a browser bundle; it works
 * the same on the GitHub ubuntu runner, which ships Chrome preinstalled.
 */
/* eslint-env node */
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/acceptance",
  // The gap is the signal — a retried flake would hide which requirement failed.
  retries: 0,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "mock-parity-report.json" }]] : [["list"]],
  use: {
    baseURL: process.env.STAGING_SITE_URL || "https://development.hecmedia.org",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    navigationTimeout: 45000
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } }
  ]
});
