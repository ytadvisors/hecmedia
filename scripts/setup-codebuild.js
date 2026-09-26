#!/usr/bin/env node

const { execFileSync } = require("child_process");

const region = process.env.AWS_REGION || "us-east-1";
const role = process.env.HECMEDIA_CODEBUILD_SERVICE_ROLE_ARN;
const sourceLocation = "https://github.com/ytadvisors/hecmedia.git";

if (!role) {
  console.error("HECMEDIA_CODEBUILD_SERVICE_ROLE_ARN is required");
  process.exit(2);
}

function aws(args) {
  return execFileSync("aws", [...args, "--region", region], {
    encoding: "utf8"
  }).trim();
}

function upsertProject(name, buildspec, environmentVariables = []) {
  const project = {
    name,
    description: `${name} — AWS-native replacement for GitHub Actions`,
    source: {
      type: "GITHUB",
      location: sourceLocation,
      gitCloneDepth: 1,
      buildspec,
      reportBuildStatus: true
    },
    artifacts: { type: "NO_ARTIFACTS" },
    environment: {
      type: "LINUX_CONTAINER",
      computeType: "BUILD_GENERAL1_SMALL",
      image: "aws/codebuild/standard:7.0",
      imagePullCredentialsType: "CODEBUILD",
      environmentVariables
    },
    serviceRole: role,
    timeoutInMinutes: 30,
    queuedTimeoutInMinutes: 60,
    cache: {
      type: "LOCAL",
      modes: ["LOCAL_SOURCE_CACHE", "LOCAL_CUSTOM_CACHE"]
    }
  };
  const exists =
    JSON.parse(
      aws([
        "codebuild",
        "batch-get-projects",
        "--names",
        name,
        "--output",
        "json"
      ])
    ).projects.length > 0;
  const file = `/tmp/${name}-${process.pid}.json`;
  require("fs").writeFileSync(file, JSON.stringify(project));
  try {
    aws([
      "codebuild",
      exists ? "update-project" : "create-project",
      "--cli-input-json",
      `file://${file}`
    ]);
  } finally {
    require("fs").unlinkSync(file);
  }
}

upsertProject("hecmedia-ci", "ci/buildspec.yml", [
  {
    name: "HECMEDIA_E2E_APOLLO_CLIENT_URI",
    value: "hecmedia/staging:apollo_client_uri",
    type: "SECRETS_MANAGER"
  },
  {
    name: "HECMEDIA_E2E_WP_HOST",
    value: "hecmedia/staging:wp_host",
    type: "SECRETS_MANAGER"
  }
]);

console.log("CodeBuild project configured: hecmedia-ci");
console.log(
  "Create the hecmedia-ci webhook only after its first manual build succeeds."
);
