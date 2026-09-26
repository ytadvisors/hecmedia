const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("keeps frontend staging deployment entrypoints retired", () => {
  [
    ".github/workflows/staging-deploy.yml",
    "scripts/staging-deploy.js",
    "scripts/verify-staging.js"
  ].forEach(relativePath => {
    expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(false);
  });
});

test("keeps production on a build-only helper with no deployment mutations", () => {
  const productionController = read("scripts/production-deploy.js");
  const buildHelper = read("scripts/edge-package-build.js");

  expect(productionController).toContain('require("./edge-package-build")');
  expect(buildHelper).not.toContain("execFileSync");
  expect(buildHelper).not.toContain("update-distribution");
  expect(buildHelper).not.toContain("update-function-code");
  expect(buildHelper).not.toContain("s3 sync");
  expect(buildHelper).not.toMatch(/async function deploy\s*\(/);
});

test("preserves the historical CI check as a retirement guard", () => {
  const ci = read(".github/workflows/ci.yml");

  expect(ci).toMatch(
    /preview-deploy:[\s\S]*?Verify staging publishing remains retired/
  );
  expect(ci).toContain("test ! -e .github/workflows/staging-deploy.yml");
  expect(ci).toContain("test ! -e scripts/staging-deploy.js");
  expect(ci).toContain("test ! -e scripts/verify-staging.js");
});

test("documents the retired staging and governed production boundaries", () => {
  const deployDocs = read("DEPLOY.md");
  const stagingDocs = read("STAGING_AUTOMATION.md");

  expect(deployDocs).toContain("NEXT 12 DEPLOYMENT BOUNDARY");
  expect(deployDocs).toContain("## Staging publishing retired");
  expect(deployDocs).toContain(".github/workflows/production-deploy.yml");
  expect(deployDocs).toContain("yarn deploy   # BLOCKED");
  expect(deployDocs).toContain("## Governed production publish and rollback");
  expect(deployDocs).toMatch(/Never infer a rollback\s+target as version N-1/);
  expect(stagingDocs).toContain("Staging deployment controller — retired");
  expect(stagingDocs).toContain("does not delete or disable cloud resources");
});

test("does not call the removed Next 12 Head rewind API during Apollo SSR", () => {
  const withApollo = read("lib/withApollo.js");

  expect(withApollo).not.toContain("Head.rewind");
  expect(withApollo).not.toMatch(/from "next\/head"/);
});
