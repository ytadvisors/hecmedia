#!/usr/bin/env node

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
 *   node scripts/staging-deploy.js deploy  # upload new assets, update Lambda, repoint CloudFront, invalidate
 *
 * "deploy" expects AWS credentials already configured in the environment
 * (this repo's workflow does that via aws-actions/configure-aws-credentials
 * against the OIDC role in hecmedia-staging-trust-policy.json) and requires:
 *   CLOUDFRONT_DISTRIBUTION_ID  - set from the HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID secret
 *
 * APOLLO_CLIENT_URI/WP_HOST are consumed by the BUILD step (next.config.js
 * inlines them into the Lambda@Edge bundle at build time - Lambda@Edge has no
 * runtime environment variables at all), not by deploy. Correctness is
 * confirmed after deploy by scripts/verify-staging.js against the rendered
 * site, not by inspecting Lambda config.
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
const API_LAMBDA_DIR = path.join(BUILD_DIR, "api-lambda");
const API_PAGES_DIR = path.join(REPO_ROOT, "pages", "api");
const STAGED_API_PAGES_DIR = path.join(
  REPO_ROOT,
  ".staging-disabled-pages-api"
);
const LAMBDA_ZIP_PATH = path.join(BUILD_DIR, "default-lambda.zip");
const CLOUDFRONT_CONFIG_PATH = path.join(BUILD_DIR, "cloudfront-config.json");

function run(cmd, args, opts = {}) {
  console.log(`+ ${cmd} ${args.join(" ")}`);
  return execFileSync(cmd, args, { encoding: "utf8", ...opts });
}

function directoryHasFiles(directory) {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const entryPath = path.join(directory, entry.name);
    return (
      entry.isFile() || (entry.isDirectory() && directoryHasFiles(entryPath))
    );
  });
}

function discardEmptyApiLambdaBundle() {
  if (!fs.existsSync(API_LAMBDA_DIR)) return;

  const manifestPath = path.join(API_LAMBDA_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    if (directoryHasFiles(API_LAMBDA_DIR)) {
      throw new Error(
        "Generated api-lambda has no manifest but contains files. Refusing to discard it."
      );
    }
    fs.rmSync(API_LAMBDA_DIR, { recursive: true, force: false });
    console.log(
      "Discarded generated api-lambda after verifying the manifest-less directory is empty."
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Generated api-lambda manifest is invalid (${err.message}). ` +
        "Refusing to discard the bundle."
    );
  }

  const dynamic = manifest && manifest.apis && manifest.apis.dynamic;
  const nonDynamic = manifest && manifest.apis && manifest.apis.nonDynamic;
  if (
    !dynamic ||
    Array.isArray(dynamic) ||
    typeof dynamic !== "object" ||
    !nonDynamic ||
    Array.isArray(nonDynamic) ||
    typeof nonDynamic !== "object"
  ) {
    throw new Error(
      "Generated api-lambda manifest has an unexpected shape. Refusing to discard it."
    );
  }

  const routes = [...Object.keys(dynamic), ...Object.keys(nonDynamic)];
  if (routes.length > 0) {
    throw new Error(
      `Generated api-lambda contains API routes: ${routes.join(", ")}. ` +
        "The staging IAM policy deliberately cannot deploy an API Lambda."
    );
  }

  const compiledApiPages = path.join(API_LAMBDA_DIR, "pages", "api");
  if (directoryHasFiles(compiledApiPages)) {
    throw new Error(
      "Generated api-lambda contains compiled API files despite an empty manifest. " +
        "Refusing to discard it."
    );
  }

  fs.rmSync(API_LAMBDA_DIR, { recursive: true, force: false });
  console.log(
    "Discarded generated api-lambda after verifying it has zero API routes."
  );
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

  // Staging is deliberately no-send and its public newsletter page never
  // invokes /api/newsletter/subscribe. The existing staging stack predates
  // Next API routes and has one tightly scoped Lambda@Edge function, so omit
  // pages/api from this package instead of creating a second Lambda or
  // widening IAM. Always restore the source tree, including after a failed
  // build. Production and any send-enabled build retain the API route.
  let apiPagesMoved = false;
  if (fs.existsSync(API_PAGES_DIR)) {
    if (process.env.HECMEDIA_NO_SEND_FORMS !== "true") {
      throw new Error(
        "Refusing to omit Next API routes unless HECMEDIA_NO_SEND_FORMS=true."
      );
    }
    if (fs.existsSync(STAGED_API_PAGES_DIR)) {
      throw new Error(
        `${STAGED_API_PAGES_DIR} already exists; refusing to overwrite it.`
      );
    }
    fs.renameSync(API_PAGES_DIR, STAGED_API_PAGES_DIR);
    apiPagesMoved = true;
  }

  try {
    await builder.build();
  } finally {
    if (apiPagesMoved) {
      fs.renameSync(STAGED_API_PAGES_DIR, API_PAGES_DIR);
    }
  }

  if (!fs.existsSync(DEFAULT_LAMBDA_DIR) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Expected ${DEFAULT_LAMBDA_DIR} and ${ASSETS_DIR} after build - the ` +
        "sls-next output layout may have changed; do not guess at new paths."
    );
  }

  discardEmptyApiLambdaBundle();

  // The granted role has permission to update exactly one Lambda@Edge
  // function. If the no-send exclusion regresses or the app needs image
  // optimization, these extra bundles cannot be deployed by this policy.
  ["api-lambda", "image-lambda"].forEach(extra => {
    if (fs.existsSync(path.join(BUILD_DIR, extra))) {
      throw new Error(
        `Build produced .serverless_nextjs/${extra}, but hecmedia-staging-deploy-policy.json ` +
          `only grants access to one Lambda@Edge function (${LAMBDA_FUNCTION_NAME}). ` +
          "That policy needs deliberate, reviewed widening before this can deploy - see task #81876."
      );
    }
  });
}

function syncAssets() {
  // Do not delete old immutable assets during a release. Until the updated
  // distribution has propagated, cached pages can still reference chunks from
  // the active Lambda version; a later deploy failure would leave that version
  // live as well. Retention-aware cleanup belongs in a separate operation.
  run("aws", [
    "s3",
    "sync",
    ASSETS_DIR,
    `s3://${BUCKET_NAME}`,
    "--region",
    REGION
  ]);
}

function zipDefaultLambda() {
  fs.rmSync(LAMBDA_ZIP_PATH, { force: true });
  run("zip", ["-r", "-X", "-q", LAMBDA_ZIP_PATH, "."], {
    cwd: DEFAULT_LAMBDA_DIR
  });
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
    run("aws", [
      "cloudfront",
      "get-distribution-config",
      "--id",
      distributionId
    ])
  );
  const etag = current.ETag;
  const config = current.DistributionConfig;

  const behaviors = [
    config.DefaultCacheBehavior,
    ...((config.CacheBehaviors && config.CacheBehaviors.Items) || [])
  ];

  const associations = behaviors.reduce((all, behavior) => {
    const lambdaAssociations = behavior.LambdaFunctionAssociations;
    return all.concat(
      lambdaAssociations && lambdaAssociations.Items
        ? lambdaAssociations.Items
        : []
    );
  }, []);
  const matchedAssociations = associations.filter(
    assoc =>
      assoc.LambdaFunctionARN &&
      assoc.LambdaFunctionARN.startsWith(`${lambdaArn}:`)
  );
  matchedAssociations.forEach(assoc => {
    Object.assign(assoc, { LambdaFunctionARN: versionedArn });
  });
  const replaced = matchedAssociations.length;

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

  // update-distribution returns before the new Lambda@Edge associations are
  // serving. Wait before invalidating or letting the workflow verify DEPLOY_SHA
  // so a verification request cannot race the previous release.
  run("aws", [
    "cloudfront",
    "wait",
    "distribution-deployed",
    "--id",
    distributionId
  ]);
  run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    distributionId,
    "--paths",
    "/*"
  ]);

  return replaced;
}

async function deploy() {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) {
    throw new Error(
      "CLOUDFRONT_DISTRIBUTION_ID is required (set from HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID)"
    );
  }

  syncAssets();

  const lambdaArn = getFunctionArn();
  const version = updateLambda();
  const replaced = updateCloudFront(distributionId, lambdaArn, version);

  console.log(
    `Deployed ${lambdaArn}:${version}; repointed ${replaced} Lambda@Edge association(s).`
  );
}

async function main() {
  const command = process.argv[2];
  if (command === "build") return build();
  if (command === "deploy") return deploy();
  throw new Error(`Unknown command "${command}". Use "build" or "deploy".`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = {
  build,
  discardEmptyApiLambdaBundle,
  syncAssets,
  updateCloudFront
};
