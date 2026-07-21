#!/usr/bin/env node
/* eslint-disable no-console */

/*
 * Updates only the three existing resources serving development.hecmedia.org.
 * It deliberately does not invoke the Serverless component: its state is not
 * present on a fresh CI checkout, and it can create IAM or Route 53 resources.
 * Every AWS command below is covered by hecmedia-staging-deploy-policy.json.
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
  // This is the packaging half of the pinned serverless-next.js dependency.
  // Builder only creates local assets and the Lambda@Edge handler; it makes no
  // AWS calls.
  // The package is a direct devDependency; this pragma accommodates linting
  // this isolated worktree before its dependencies are installed.
  // eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
  const { Builder } = require("@sls-next/lambda-at-edge");
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
      throw new Error(`Build produced ${unsupported}, but the reviewed role can update only ${FUNCTION_NAME}. A separate reviewed change is required.`);
    }
  });
}

function assertExistingFunction() {
  const result = JSON.parse(run("aws", [
    "lambda", "get-function", "--function-name", FUNCTION_NAME, "--region", REGION
  ]));
  if (result.Configuration.FunctionArn !== FUNCTION_ARN) {
    throw new Error(`Expected existing staging Lambda ${FUNCTION_ARN}; refusing to update ${result.Configuration.FunctionArn || "an unknown function"}.`);
  }
}

function zipLambda() {
  fs.rmSync(LAMBDA_ZIP, { force: true });
  run("zip", ["-r", "-X", "-q", LAMBDA_ZIP, "."], { cwd: DEFAULT_LAMBDA });
}

function updateLambda() {
  zipLambda();
  run("aws", [
    "lambda", "update-function-code", "--function-name", FUNCTION_NAME,
    "--zip-file", `fileb://${LAMBDA_ZIP}`, "--region", REGION
  ]);
  // The CLI waiter uses GetFunctionConfiguration, included in the reviewed policy.
  run("aws", ["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME, "--region", REGION]);
  return JSON.parse(run("aws", [
    "lambda", "publish-version", "--function-name", FUNCTION_NAME, "--region", REGION
  ])).Version;
}

function updateDistribution(version) {
  const response = JSON.parse(run("aws", ["cloudfront", "get-distribution-config", "--id", DISTRIBUTION_ID]));
  const config = response.DistributionConfig;
  const replaceAssociations = behavior => {
    const associations = behavior.LambdaFunctionAssociations;
    if (!associations || !associations.Items) return { behavior, updated: 0 };
    let updated = 0;
    const items = associations.Items.map(association => {
      if (!association.LambdaFunctionARN || !association.LambdaFunctionARN.startsWith(`${FUNCTION_ARN}:`)) return association;
      updated += 1;
      return { ...association, LambdaFunctionARN: `${FUNCTION_ARN}:${version}` };
    });
    return { behavior: { ...behavior, LambdaFunctionAssociations: { ...associations, Items: items } }, updated };
  };
  const defaultBehavior = replaceAssociations(config.DefaultCacheBehavior);
  const cacheBehaviors = ((config.CacheBehaviors && config.CacheBehaviors.Items) || []).map(replaceAssociations);
  config.DefaultCacheBehavior = defaultBehavior.behavior;
  if (config.CacheBehaviors) {
    config.CacheBehaviors = { ...config.CacheBehaviors, Items: cacheBehaviors.map(result => result.behavior) };
  }
  const updated = defaultBehavior.updated + cacheBehaviors.reduce((total, result) => total + result.updated, 0);
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
  // Check the named resource before any write. The workflow separately checks
  // its environment secret equals the same reviewed distribution ID.
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
