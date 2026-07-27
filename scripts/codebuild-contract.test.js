const fs = require("fs");

test("uses AWS CodeBuild for CI and authorized exact-SHA staging releases", () => {
  const ci = fs.readFileSync("ci/buildspec.yml", "utf8");
  const staging = fs.readFileSync("ci/buildspec.staging.yml", "utf8");
  const setup = fs.readFileSync("scripts/setup-codebuild.js", "utf8");
  const release = fs.readFileSync(
    "scripts/staging-release-codebuild.js",
    "utf8"
  );

  expect(ci).toMatch(/yarn lint/);
  expect(ci).toMatch(/yarn test/);
  expect(ci).toMatch(/E2E_ALLOW_WRITES=0/);
  expect(staging).toMatch(/development\.hecmedia\.org/);
  expect(staging).toMatch(/node scripts\/staging-deploy\.js build/);
  expect(staging).toMatch(
    /export HECMEDIA_TOPBAR_CTAS_JSON="\$HECMEDIA_STAGING_TOPBAR_CTAS_JSON"/
  );
  expect(staging).toMatch(/node scripts\/staging-deploy\.js deploy/);
  expect(staging).toMatch(/node scripts\/verify-staging\.js/);
  expect(staging).not.toMatch(/production\.hecmedia|www\.hecmedia/);
  expect(setup).toMatch(/hecmedia-ci/);
  expect(setup).toMatch(/hecmedia-staging/);
  expect(setup).toMatch(/SECRETS_MANAGER/);
  expect(release).toMatch(/exact-40-character-merged-sha/);
  expect(release).toMatch(/--source-version/);
  expect(release).toMatch(/HECMEDIA_RELEASE_AUTHORIZED_BY.*ytwguru/);
  expect(release).not.toMatch(/workflow run|github actions/i);
});
