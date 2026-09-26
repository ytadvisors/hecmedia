const fs = require("fs");

test("uses AWS CodeBuild for lint, coverage and read-only API contracts", () => {
  const ci = fs.readFileSync("ci/buildspec.yml", "utf8");
  const setup = fs.readFileSync("scripts/setup-codebuild.js", "utf8");
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  expect(ci).toMatch(/yarn lint/);
  expect(ci).toMatch(/yarn test/);
  expect(ci).toMatch(/E2E_ALLOW_WRITES=0/);
  expect(setup).toMatch(/hecmedia-ci/);
  expect(setup).toMatch(/SECRETS_MANAGER/);
  expect(setup).not.toMatch(/upsertProject\("hecmedia-staging"/);
  expect(workflow).not.toMatch(/yarn (install|lint|test)|setup-node/);
  expect(fs.existsSync("ci/buildspec.staging.yml")).toBe(false);
  expect(fs.existsSync("scripts/staging-release-codebuild.js")).toBe(false);
});
