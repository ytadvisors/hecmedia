#!/usr/bin/env node
/* eslint-disable no-console */

/*
 * Updates the three pre-existing resources serving development.hecmedia.org.
 * This intentionally does not invoke the Serverless component: a fresh CI
 * checkout has no component state and could otherwise create IAM or Route 53
 * resources. Every AWS command below is covered by the reviewed OIDC policy.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REGION = "us-east-1";
const BUCKET = "mf64oua-escbzh";
const FUNCTION_NAME = "mf64oua-5ao6wt";
const FUNCTION_ARN = "arn:aws:lambda:us-east-1:850335719356:function:mf64oua-5ao6wt";
const DISTRIBUTION_ID = "E1ARETO6518UT4";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, ".serverless_nextjs");
const ASSETS = path.join(OUTPUT, "assets");
const DEFAULT_LAMBDA = path.join(OUTPUT, "default-lambda");
const LAMBDA_ZIP = path.join(OUTPUT, "default-lambda.zip");
const DISTRIBUTION_CONFIG = path.join(OUTPUT, "distribution-config.json");

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, { encoding: "utf8", ...options });
}

async function build() {
  // This is the packaging library used by the pinned serverless-next.js
  // dependency. Builder performs a local Next build and emits the exact
  // assets/default-lambda layout; it makes no AWS calls.
  const lambdaAtEdgePackage = "@sls-next/lambda-at-edge";
  // eslint-disable-next-line import/no-dynamic-require
  const { Builder } = require(lambdaAtEdgePackage);
  const builder = new Builder(ROOT, OUTPUT, {
    cmd: "node_modules/.bin/next",
    args: ["build"],
    cwd: ROOT
  });
  await builder.build();

  if (!fs.existsSync(ASSETS) || !fs.existsSync(DEFAULT_LAMBDA)) {
    throw new Error("Expected .serverless_nextjs/assets and default-lambda after packaging; refusing to guess an output layout.");
  }

  ["api-lambda", "image-lambda"].forEach(unsupported => {
    if (fs.existsSync(path.join(OUTPUT, unsupported))) {
      throw new Error(`Build produced ${unsupported}, but the approved role can update only ${FUNCTION_NAME}. A separate reviewed change is required.`);
    }
  });
}

function zipLambda() {
  fs.rmSync(LAMBDA_ZIP, { force: true });
  run("zip", ["-r", "-X", "-q", LAMBDA_ZIP, "."], { cwd: DEFAULT_LAMBDA });
}

function assertExistingFunction() {
  const result = JSON.parse(run("aws", [
    "lambda", "get-function", "--function-name", FUNCTION_NAME, "--region", REGION
  ]));
  if (result.Configuration.FunctionArn !== FUNCTION_ARN) {
    throw new Error(`Expected existing staging Lambda ${FUNCTION_ARN}; refusing to update ${result.Configuration.FunctionArn || "an unknown function"}.`);
  }
}

function updateLambda() {
  zipLambda();
  run("aws", [
    "lambda", "update-function-code", "--function-name", FUNCTION_NAME,
    "--zip-file", `fileb://${LAMBDA_ZIP}`, "--region", REGION
  ]);
  run("aws", ["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME, "--region", REGION]);
  return JSON.parse(run("aws", [
    "lambda", "publish-version", "--function-name", FUNCTION_NAME, "--region", REGION
  ])).Version;
}

function associations(config) {
  return [config.DefaultCacheBehavior, ...((config.CacheBehaviors && config.CacheBehaviors.Items) || [])]
    .flatMap(behavior => (behavior.LambdaFunctionAssociations && behavior.LambdaFunctionAssociations.Items) || []);
}

function updateDistribution(version) {
  const response = JSON.parse(run("aws", ["cloudfront", "get-distribution-config", "--id", DISTRIBUTION_ID]));
  const config = response.DistributionConfig;
  let updated = 0;
  associations(config).forEach(association => {
    if (association.LambdaFunctionARN && association.LambdaFunctionARN.startsWith(`${FUNCTION_ARN}:`)) {
      const associationToUpdate = association;
      associationToUpdate.LambdaFunctionARN = `${FUNCTION_ARN}:${version}`;
      updated += 1;
    }
  });
  if (updated === 0) {
    throw new Error(`No ${FUNCTION_NAME} Lambda@Edge associations exist on ${DISTRIBUTION_ID}; refusing a blind distribution update.`);
  }
  fs.writeFileSync(DISTRIBUTION_CONFIG, JSON.stringify(config));
  run("aws", [
    "cloudfront", "update-distribution", "--id", DISTRIBUTION_ID,
    "--distribution-config", `file://${DISTRIBUTION_CONFIG}`, "--if-match", response.ETag
  ]);
  run("aws", ["cloudfront", "create-invalidation", "--distribution-id", DISTRIBUTION_ID, "--paths", "/*"]);
  return updated;
}

function deploy() {
  if (!fs.existsSync(ASSETS) || !fs.existsSync(DEFAULT_LAMBDA)) {
    throw new Error("Run `node scripts/staging-deploy.js build` before deploy.");
  }
  assertExistingFunction();
  run("aws", ["s3", "sync", ASSETS, `s3://${BUCKET}`, "--delete", "--region", REGION]);
  const version = updateLambda();
  const updated = updateDistribution(version);
  console.log(`Published ${FUNCTION_NAME}:${version} and updated ${updated} Lambda@Edge association(s).`);
}

async function main() {
  if (process.argv[2] === "build") return build();
  if (process.argv[2] === "deploy") return deploy();
  throw new Error("Usage: node scripts/staging-deploy.js <build|deploy>");
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
