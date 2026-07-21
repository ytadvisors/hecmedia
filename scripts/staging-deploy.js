#!/usr/bin/env node
"use strict";

/*
 * Scoped staging deploy for development.hecmedia.org.
 *
 * Replaces `yarn deploy` (@sls-next/serverless-component / the `serverless` CLI),
 * which builds+deploys as if the stack doesn't exist yet and therefore needs
 * iam:CreateRole + iam:PassRole plus route53:ChangeResourceRecordSets on the
 * PRODUCTION hecmedia.org zone. This script only UPDATES the three resources
 * that already serve development.hecmedia.org, matching
 * hecmedia-staging-deploy-policy.json exactly:
 *   - S3 bucket   mf64oua-escbzh   (static assets)
 *   - Lambda@Edge mf64oua-5ao6wt   (SSR handler; origin-request + origin-response)
 *   - CloudFront  E1ARETO6518UT4   (alias development.hecmedia.org)
 *
 * Usage:
 *   node scripts/staging-deploy.js build   # next build -> .serverless_nextjs/{assets,default-lambda}
 *   node scripts/staging-deploy.js deploy  # sync assets, update Lambda, repoint CloudFront, invalidate
 *
 * "deploy" expects AWS credentials already configured in the environment
 * (this repo's workflow does that via aws-actions/configure-aws-credentials
 * against the OIDC role in hecmedia-staging-trust-policy.json) and requires:
 *   CLOUDFRONT_DISTRIBUTION_ID  - set from the HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID secret
 *   APOLLO_CLIENT_URI, WP_HOST - only used to sanity-check the Lambda's existing
 *                                 runtime config (see checkLambdaEnvironment below);
 *                                 not applied to the function.
 */

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");

const REGION = "us-east-1";
const BUCKET_NAME = "mf64oua-escbzh";
const LAMBDA_FUNCTION_NAME = "mf64oua-5ao6wt";
const REPO_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(REPO_ROOT, ".serverless_nextjs");
const ASSETS_DIR = path.join(BUILD_DIR, "assets");
const DEFAULT_LAMBDA_DIR = path.join(BUILD_DIR, "default-lambda");
const LAMBDA_ZIP_PATH = path.join(BUILD_DIR, "default-lambda.zip");
const CLOUDFRONT_CONFIG_PATH = path.join(BUILD_DIR, "cloudfront-config.json");

function run(cmd, args, opts = {}) {
  console.log(`+ ${cmd} ${args.join(" ")}`);
  return execFileSync(cmd, args, { encoding: "utf8", ...opts });
}

async function build() {
  // @sls-next/lambda-at-edge is the packaging half of the pipeline this stack
  // was originally built with. Using it directly (instead of the full
  // @sls-next/serverless-component) runs `next build` and repackages the
  // output into a Lambda@Edge-ready handler + static assets - no AWS calls.
  const { Builder } = require("@sls-next/lambda-at-edge");
  const builder = new Builder(REPO_ROOT, BUILD_DIR, {
    cmd: "node_modules/.bin/next",
    args: ["build"]
  });
  await builder.build();

  if (!fs.existsSync(DEFAULT_LAMBDA_DIR) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Expected ${DEFAULT_LAMBDA_DIR} and ${ASSETS_DIR} after build - the ` +
        "sls-next output layout may have changed; do not guess at new paths."
    );
  }

  // The granted role has permission to update exactly one Lambda@Edge
  // function. If the app now needs API routes or image optimization, the
  // build will also emit api-lambda/ or image-lambda/, which this policy
  // cannot deploy - fail loudly instead of silently shipping a half-deploy.
  for (const extra of ["api-lambda", "image-lambda"]) {
    if (fs.existsSync(path.join(BUILD_DIR, extra))) {
      throw new Error(
        `Build produced .serverless_nextjs/${extra}, but hecmedia-staging-deploy-policy.json ` +
          `only grants access to one Lambda@Edge function (${LAMBDA_FUNCTION_NAME}). ` +
          "That policy needs deliberate, reviewed widening before this can deploy - see task #81876."
      );
    }
  }
}

function syncAssets() {
  run("aws", [
    "s3",
    "sync",
    ASSETS_DIR,
    `s3://${BUCKET_NAME}`,
    "--delete",
    "--region",
    REGION
  ]);
}

function zipDefaultLambda() {
  fs.rmSync(LAMBDA_ZIP_PATH, { force: true });
  run("zip", ["-r", "-X", "-q", LAMBDA_ZIP_PATH, "."], { cwd: DEFAULT_LAMBDA_DIR });
}

function getFunctionArn() {
  const out = JSON.parse(
    run("aws", [
      "lambda",
      "get-function",
      "--function-name",
      LAMBDA_FUNCTION_NAME,
      "--region",
      REGION
    ])
  );
  return out.Configuration.FunctionArn;
}

// lambda:UpdateFunctionCode replaces code only - it cannot change the
// function's environment variables, and this role deliberately has no
// lambda:UpdateFunctionConfiguration (that's a much wider blast radius than
// "update the code"). APOLLO_CLIENT_URI/WP_HOST are read by lib/initApollo.js
// and pages/[page].js at request time from process.env, so they must already
// be correct on the live function - this only verifies that, using the
// read-only lambda:GetFunctionConfiguration this role does have.
function checkLambdaEnvironment(expected) {
  const out = JSON.parse(
    run("aws", [
      "lambda",
      "get-function-configuration",
      "--function-name",
      LAMBDA_FUNCTION_NAME,
      "--region",
      REGION
    ])
  );
  const actual = (out.Environment && out.Environment.Variables) || {};
  const mismatches = Object.entries(expected)
    .filter(([, expectedValue]) => Boolean(expectedValue))
    .filter(([key, expectedValue]) => actual[key] !== expectedValue)
    .map(([key, expectedValue]) => `${key}: deployed="${actual[key] || "(unset)"}" expected="${expectedValue}"`);

  if (mismatches.length > 0) {
    throw new Error(
      "New code was NOT deployed: the Lambda's existing runtime environment variables " +
        `do not match what this run expects:\n  ${mismatches.join("\n  ")}\n` +
        "This role only has lambda:UpdateFunctionCode/GetFunctionConfiguration, not " +
        "UpdateFunctionConfiguration, so it cannot fix this itself. Correct it out of band " +
        "(console, or a separately reviewed change to hecmedia-staging-deploy-policy.json) " +
        "before re-running - don't widen the policy just to make this check pass."
    );
  }
}

function updateLambda() {
  zipDefaultLambda();
  run("aws", [
    "lambda",
    "update-function-code",
    "--function-name",
    LAMBDA_FUNCTION_NAME,
    "--zip-file",
    `fileb://${LAMBDA_ZIP_PATH}`,
    "--region",
    REGION
  ]);
  run("aws", [
    "lambda",
    "wait",
    "function-updated",
    "--function-name",
    LAMBDA_FUNCTION_NAME,
    "--region",
    REGION
  ]);
  const publishOut = JSON.parse(
    run("aws", [
      "lambda",
      "publish-version",
      "--function-name",
      LAMBDA_FUNCTION_NAME,
      "--region",
      REGION
    ])
  );
  return publishOut.Version;
}

// Repoints every LambdaFunctionAssociation on the distribution that
// currently references mf64oua-5ao6wt at the freshly published version.
// Per task #81876's verified facts, that's the default cache behavior
// (origin-request + origin-response) and _next/data/* - discovered from the
// live config rather than hardcoded, so this keeps working if that changes.
function updateCloudFront(distributionId, lambdaArn, version) {
  const versionedArn = `${lambdaArn}:${version}`;
  const current = JSON.parse(
    run("aws", ["cloudfront", "get-distribution-config", "--id", distributionId])
  );
  const etag = current.ETag;
  const config = current.DistributionConfig;

  const behaviors = [
    config.DefaultCacheBehavior,
    ...((config.CacheBehaviors && config.CacheBehaviors.Items) || [])
  ];

  let replaced = 0;
  for (const behavior of behaviors) {
    const items = behavior.LambdaFunctionAssociations && behavior.LambdaFunctionAssociations.Items;
    if (!items) continue;
    for (const assoc of items) {
      if (assoc.LambdaFunctionARN && assoc.LambdaFunctionARN.startsWith(`${lambdaArn}:`)) {
        assoc.LambdaFunctionARN = versionedArn;
        replaced++;
      }
    }
  }

  if (replaced === 0) {
    throw new Error(
      `No LambdaFunctionAssociations referencing ${lambdaArn} were found on distribution ` +
        `${distributionId}. Refusing to update the distribution blindly - the resource may not ` +
        "be the one this workflow expects; investigate before retrying."
    );
  }

  fs.writeFileSync(CLOUDFRONT_CONFIG_PATH, JSON.stringify(config));
  run("aws", [
    "cloudfront",
    "update-distribution",
    "--id",
    distributionId,
    "--distribution-config",
    `file://${CLOUDFRONT_CONFIG_PATH}`,
    "--if-match",
    etag
  ]);
  run("aws", ["cloudfront", "create-invalidation", "--distribution-id", distributionId, "--paths", "/*"]);

  return replaced;
}

async function deploy() {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) {
    throw new Error("CLOUDFRONT_DISTRIBUTION_ID is required (set from HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID)");
  }

  checkLambdaEnvironment({
    APOLLO_CLIENT_URI: process.env.APOLLO_CLIENT_URI,
    WP_HOST: process.env.WP_HOST
  });

  syncAssets();

  const lambdaArn = getFunctionArn();
  const version = updateLambda();
  const replaced = updateCloudFront(distributionId, lambdaArn, version);

  console.log(`Deployed ${lambdaArn}:${version}; repointed ${replaced} Lambda@Edge association(s).`);
}

async function main() {
  const command = process.argv[2];
  if (command === "build") return build();
  if (command === "deploy") return deploy();
  throw new Error(`Unknown command "${command}". Use "build" or "deploy".`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
