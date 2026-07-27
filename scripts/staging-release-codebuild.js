#!/usr/bin/env node

const { execFileSync } = require("child_process");

if (process.env.HECMEDIA_RELEASE_AUTHORIZED_BY !== "ytwguru") {
  console.error(
    "Staging releases require HECMEDIA_RELEASE_AUTHORIZED_BY=ytwguru"
  );
  process.exit(1);
}

const ref = process.argv[2];
if (!ref || !/^[0-9a-f]{40}$/i.test(ref)) {
  console.error(
    "Usage: node scripts/staging-release-codebuild.js <exact-40-character-merged-sha>"
  );
  process.exit(2);
}

const region = process.env.AWS_REGION || "us-east-1";
const raw = execFileSync(
  "aws",
  [
    "codebuild",
    "start-build",
    "--project-name",
    "hecmedia-staging",
    "--source-version",
    ref,
    "--region",
    region,
    "--output",
    "json"
  ],
  { encoding: "utf8" }
);
const { build } = JSON.parse(raw);
if (!build?.id) throw new Error("CodeBuild did not return a build id");
console.log(
  JSON.stringify({
    buildId: build.id,
    exactSha: ref,
    target: "https://development.hecmedia.org"
  })
);
