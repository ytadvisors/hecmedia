module.exports = {
  rootDir: __dirname,
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/e2e/**/*.e2e.test.js"],
  testTimeout: 20000,
  collectCoverage: false,
  verbose: true
};
