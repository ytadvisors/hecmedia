#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { build: buildDefaultEdgePackage } = require("./edge-package-build");
const { captureHydratedRoutes } = require("./production-browser-verifier");
const {
  parseExpectedCounts,
  verifyPublicResource
} = require("./verify-gtm-resource");
const {
  assertCandidateTree,
  assertRemoteBaseline,
  assertUploadedCandidates,
  candidateTree,
  loadBoundManifest,
  preparePreimages,
  restorePreimages,
  validateManifest
} = require("./production-s3-recovery");

const REGION = "us-east-1";
const ACCOUNT_ID = "850335719356";
const DISTRIBUTION_ID = "E2QXRSF2W55RTS";
const BUCKET_NAME = "x2l4ew-k0m7umi";
const ORIGIN_ID = "x2l4ew-k0m7umi";
const DEFAULT_FUNCTION_NAME = "x2l4ew-l5vb7pd";
const DEFAULT_FUNCTION_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${DEFAULT_FUNCTION_NAME}`;
const EDGE_EXECUTION_ROLE = "arn:aws:iam::850335719356:role/x2l4ew-0kb1zus";
// Immutable, credential-free rollback retained outside the normal release lane.
// Do not delete this published version while it is pinned here and in the playbook.
const SANITIZED_ROLLBACK_ARN = `${DEFAULT_FUNCTION_ARN}:150`;
const SANITIZED_ROLLBACK_CODE_SHA256 =
  "InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag=";
// reCAPTCHA site keys are intentionally public and already ship in the client
// bundle. Pin the exact production key so the credential-free candidate job
// does not need protected-environment access merely to build the assets.
const PRODUCTION_RECAPTCHA_SITE_KEY =
  "6Lf8RFAUAAAAAPArR_euM1R2KgaGujAOUAofjdZo";
const API_PATH = "api/newsletter/subscribe";
const REPO_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(REPO_ROOT, ".serverless_nextjs");
const ASSETS_DIR = path.join(BUILD_DIR, "assets");
const DEFAULT_LAMBDA_DIR = path.join(BUILD_DIR, "default-lambda");
const RELEASE_DIR = path.join(REPO_ROOT, ".production-release");
const DEFAULT_ZIP = path.join(RELEASE_DIR, "default-lambda.zip");
const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  process.env.EVIDENCE_PATH || "production-deploy-evidence.json"
);
const APPROVED_PUBLISHERS = new Set([
  "ytwguru",
  "yt-agent-tom",
  "yt-agent-tom-gpt",
  "yt-agent-tom-grok"
]);

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    ...options
  });
}

/**
 * Parse AWS CLI JSON stdout.
 * `aws s3api get-bucket-versioning` returns empty body when versioning has
 * never been configured — treat that as {} so deploy can fail closed without
 * mistaking an empty response for a CLI failure.
 */
function parseJsonOutput(text, options = {}) {
  const trimmed = String(text == null ? "" : text).trim();
  if (!trimmed) {
    if (options.allowEmptyObject) {
      return {};
    }
    throw new Error("Expected JSON output but command returned empty stdout");
  }
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    throw new Error(`Expected JSON output but parse failed: ${message}`);
  }
}

function runJson(command, args, options = {}) {
  return parseJsonOutput(run(command, args), options);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function versionedArn(baseArn, version) {
  const arn = `${baseArn}:${version}`;
  if (
    !/^arn:aws:lambda:us-east-1:\d{12}:function:[A-Za-z0-9-_]+:[1-9][0-9]*$/.test(
      arn
    )
  ) {
    throw new Error(`Invalid published Lambda@Edge ARN: ${arn}`);
  }
  return arn;
}

function publishedVersionFromArn(arn) {
  const match = String(arn || "").match(/:([1-9][0-9]*)$/);
  if (!match) {
    throw new Error(`Invalid published Lambda@Edge ARN: ${arn}`);
  }
  return match[1];
}

function zipCodeSha256(zipPath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(zipPath))
    .digest("base64");
}

function fileSha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap(entry => {
    if (!entry || typeof entry.name !== "string") return [];
    const entryPath = path.join(directory, entry.name);
    try {
      if (entry.isDirectory()) return listFiles(entryPath);
      if (entry.isFile()) return [entryPath];
      return [];
    } catch (err) {
      throw new Error(
        `listFiles failed on ${entryPath}: ${
          err && err.message ? err.message : err
        }`
      );
    }
  });
}

function assertNoEmbeddedAccessKeys(directory) {
  const leaked = listFiles(directory).filter(file =>
    /(?:AKIA|ASIA)[0-9A-Z]{16}/.test(fs.readFileSync(file).toString("latin1"))
  );
  if (leaked.length > 0) {
    throw new Error(
      `Build contains embedded AWS access-key material in ${leaked.length} file(s); refusing production package.`
    );
  }
}

function assertBuiltGtmContract(directories, gtmId = "GTM-57RZPNN") {
  const files = directories
    .flatMap(directory => listFiles(directory))
    .filter(file => /\.(?:html?|js|json|map|txt)$/i.test(file));
  const idFiles = [];
  const loaderFiles = [];
  const invalidFiles = [];
  const ids = new Set();
  files.forEach(file => {
    const content = fs.readFileSync(file, "utf8");
    (content.match(/\bGTM-[A-Z0-9]+\b/g) || []).forEach(id => ids.add(id));
    if (content.includes(gtmId)) idFiles.push(path.relative(REPO_ROOT, file));
    if (content.includes("www.googletagmanager.com/gtm.js?id=")) {
      loaderFiles.push(path.relative(REPO_ROOT, file));
    }
    if (/GTM-undefined|googletagmanager[^\n]{0,500}undefined/i.test(content)) {
      invalidFiles.push(path.relative(REPO_ROOT, file));
    }
  });
  if (
    ids.size !== 1 ||
    !ids.has(gtmId) ||
    idFiles.length === 0 ||
    loaderFiles.length === 0 ||
    invalidFiles.length > 0
  ) {
    throw new Error(
      `Built candidate GTM contract failed (ids=${Array.from(ids).join(",") ||
        "none"}, idFiles=${idFiles.length}, loaderFiles=${
        loaderFiles.length
      }, invalidFiles=${invalidFiles.length}).`
    );
  }
  return {
    checked_files: files.length,
    container_id: gtmId,
    id_files: idFiles,
    loader_files: loaderFiles
  };
}

function assertFunctionContract(
  config,
  expectedArn,
  expectedMemory,
  options = {}
) {
  // Published Lambda@Edge versions are immutable. Live CloudFront still pins
  // historical :146 which was published on nodejs12.x; $LATEST and new
  // publishes must be nodejs24.x. Allow both for baseline version checks.
  const allowedRuntimes = options.allowedRuntimes || ["nodejs24.x"];
  if (
    !config ||
    config.FunctionArn !== expectedArn ||
    !allowedRuntimes.includes(config.Runtime) ||
    config.Handler !== "index.handler" ||
    config.Role !== EDGE_EXECUTION_ROLE ||
    config.Timeout !== 30 ||
    config.MemorySize !== expectedMemory ||
    config.PackageType !== "Zip" ||
    config.State !== "Active" ||
    config.LastUpdateStatus !== "Successful" ||
    JSON.stringify(config.Architectures || []) !== JSON.stringify(["x86_64"])
  ) {
    throw new Error(
      `Lambda runtime contract drifted for ${expectedArn}` +
        ` (runtime=${config && config.Runtime}, allowed=${allowedRuntimes.join(
          ","
        )}).`
    );
  }
}

function requireBuildContract(env = process.env) {
  const exact = {
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    WP_HOST: "https://prod-wp.hectv.org",
    SITE_HOST: "https://hecmedia.org",
    HECMEDIA_NO_SEND_FORMS: "false",
    HECMEDIA_EDGE_API: "false",
    HECMEDIA_NEWSLETTER_MODE: "omit",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_MODERN_WPGRAPHQL: "true",
    RE_CAPTCHA_SITE_KEY: PRODUCTION_RECAPTCHA_SITE_KEY
  };
  Object.entries(exact).forEach(([name, value]) => {
    if (env[name] !== value) {
      throw new Error(`${name} must equal ${value} for production.`);
    }
  });
  if (!/^[0-9a-f]{40}$/.test(env.DEPLOY_SHA || "")) {
    throw new Error("DEPLOY_SHA must be an exact 40-character commit SHA.");
  }
  // GTM container ids are public (emitted in HTML). Fail closed on both missing
  // and wrong container so non-workflow / misconfigured paths cannot ship a
  // different GTM than the approved production property (GTM-57RZPNN).
  const productionGtmContainerId = "GTM-57RZPNN";
  if (env.GA_TAGMANAGER_ID !== productionGtmContainerId) {
    throw new Error(
      `GA_TAGMANAGER_ID must equal ${productionGtmContainerId} for production.`
    );
  }
  if (!/^[1-9][0-9]*$/.test(env.EXPECTED_GTM_RESOURCE_VERSION || "")) {
    throw new Error(
      "EXPECTED_GTM_RESOURCE_VERSION must be a positive published version."
    );
  }
  if (!/^[0-9a-f]{64}$/.test(env.EXPECTED_GTM_CANONICAL_SHA256 || "")) {
    throw new Error("EXPECTED_GTM_CANONICAL_SHA256 must be an exact SHA-256.");
  }
  parseExpectedCounts(env.EXPECTED_GTM_COUNTS);
  if (!/^[0-9a-f]{64}$/.test(env.EXPECTED_GTM_INVENTORY_SHA256 || "")) {
    throw new Error("EXPECTED_GTM_INVENTORY_SHA256 must be an exact SHA-256.");
  }
}

function assertGovernedDeployContext(env = process.env, action = "deploy") {
  if (
    env.GITHUB_ACTIONS !== "true" ||
    env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
    !String(env.GITHUB_WORKFLOW_REF || "").includes(
      "/.github/workflows/production-deploy.yml@"
    )
  ) {
    throw new Error(
      "Production mutation is allowed only through the governed production-deploy workflow_dispatch."
    );
  }
  if (!APPROVED_PUBLISHERS.has(env.GITHUB_ACTOR)) {
    throw new Error(
      "GitHub actor is not an approved HEC production publisher."
    );
  }
  if (!/^[1-9][0-9]*$/.test(env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID || "")) {
    throw new Error(
      "A positive HEC production queue-task receipt is required."
    );
  }
  if (!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || "")) {
    throw new Error("A positive GitHub Actions run ID is required.");
  }
  if (!/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT || "")) {
    throw new Error("A positive GitHub Actions run attempt is required.");
  }
  const confirmation =
    action === "rollback"
      ? "ROLLBACK HEC FRONTEND PRODUCTION"
      : "DEPLOY HEC FRONTEND PRODUCTION";
  if (env.PRODUCTION_CONFIRMATION !== confirmation) {
    throw new Error("Production confirmation phrase does not match.");
  }
  if (!/^[0-9a-f]{40}$/.test(env.DEPLOY_SHA || "")) {
    throw new Error("DEPLOY_SHA must be an exact 40-character commit SHA.");
  }
  if (action === "rollback") {
    if (!/^[1-9][0-9]*$/.test(env.SOURCE_DEPLOY_TASK_ID || "")) {
      throw new Error("Rollback requires the original deploy task ID.");
    }
    if (!/^[1-9][0-9]*$/.test(env.SOURCE_DEPLOY_RUN_ID || "")) {
      throw new Error("Rollback requires the original deploy run ID.");
    }
    if (!/^[1-9][0-9]*$/.test(env.SOURCE_DEPLOY_RUN_ATTEMPT || "")) {
      throw new Error("Rollback requires the original deploy run attempt.");
    }
    if (!/^[0-9a-f]{40}$/.test(env.SOURCE_DEPLOY_RELEASE_SHA || "")) {
      throw new Error("Rollback requires the original deploy release SHA.");
    }
    if (!/^[A-Z0-9]+$/.test(env.SOURCE_DEPLOY_BASELINE_ETAG || "")) {
      throw new Error("Rollback requires the original deploy baseline ETag.");
    }
    if (!/^[0-9a-f]{40}$/.test(env.SOURCE_DEPLOY_BASELINE_RELEASE_SHA || "")) {
      throw new Error(
        "Rollback requires the original deploy baseline public release SHA."
      );
    }
    if (!/^[0-9a-f]{64}$/.test(env.PREIMAGE_MANIFEST_SHA256 || "")) {
      throw new Error("Rollback requires the exact preimage manifest SHA-256.");
    }
    const expectedKey = `_deployment-evidence/${env.SOURCE_DEPLOY_TASK_ID}/${env.SOURCE_DEPLOY_RUN_ID}/${env.SOURCE_DEPLOY_RUN_ATTEMPT}/${env.SOURCE_DEPLOY_RELEASE_SHA}/s3-preimage-manifest.json`;
    if (env.PREIMAGE_MANIFEST_KEY !== expectedKey) {
      throw new Error(
        "Rollback preimage manifest key is not bound to the exact original deploy."
      );
    }
  }
}

function behaviorItems(config) {
  return [
    config.DefaultCacheBehavior,
    ...((config.CacheBehaviors && config.CacheBehaviors.Items) || [])
  ];
}

function defaultAssociations(config) {
  return behaviorItems(config).flatMap(behavior => {
    const items =
      behavior &&
      behavior.LambdaFunctionAssociations &&
      behavior.LambdaFunctionAssociations.Items;
    return items || [];
  });
}

function assertVersionArn(arn, expectedBase) {
  if (
    !new RegExp(
      `^${expectedBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\d+$`
    ).test(arn || "")
  ) {
    throw new Error(`Expected a published version of ${expectedBase}.`);
  }
}

function assertDistributionContract(
  config,
  expectedDefaultVersionArn,
  expectedApiVersionArn = "none"
) {
  if (!config || !config.DefaultCacheBehavior) {
    throw new Error("Production CloudFront default behavior is missing.");
  }
  const aliases = ((config.Aliases && config.Aliases.Items) || [])
    .slice()
    .sort();
  if (aliases.join(",") !== "hecmedia.org,www.hecmedia.org") {
    throw new Error("Production CloudFront aliases changed; refusing release.");
  }
  if (config.DefaultCacheBehavior.TargetOriginId !== ORIGIN_ID) {
    throw new Error("Production CloudFront origin changed; refusing release.");
  }
  if (
    !config.DefaultCacheBehavior.ForwardedValues ||
    config.DefaultCacheBehavior.ForwardedValues.QueryString !== true
  ) {
    throw new Error(
      "Production default behavior must forward query strings for fresh-response verification."
    );
  }
  const origins = (config.Origins && config.Origins.Items) || [];
  if (
    origins.length !== 1 ||
    origins[0].Id !== ORIGIN_ID ||
    origins[0].DomainName !== `${BUCKET_NAME}.s3.us-east-1.amazonaws.com`
  ) {
    throw new Error("Production S3 origin contract changed; refusing release.");
  }

  const allAssociations = defaultAssociations(config);
  const ownedAssociations = allAssociations.filter(association =>
    String(association.LambdaFunctionARN || "").startsWith(
      `${DEFAULT_FUNCTION_ARN}:`
    )
  );
  if (allAssociations.length !== 4 || ownedAssociations.length !== 4) {
    throw new Error(
      `Expected exactly four owned production SSR Lambda associations, found ${ownedAssociations.length} owned / ${allAssociations.length} total.`
    );
  }
  const dataBehavior = (
    (config.CacheBehaviors && config.CacheBehaviors.Items) ||
    []
  ).find(behavior => behavior.PathPattern === "_next/data/*");
  [config.DefaultCacheBehavior, dataBehavior].forEach((behavior, index) => {
    const associations =
      behavior &&
      behavior.LambdaFunctionAssociations &&
      behavior.LambdaFunctionAssociations.Items;
    const events = (associations || [])
      .map(association => association.EventType)
      .sort();
    if (
      !behavior ||
      !associations ||
      associations.length !== 2 ||
      events.join(",") !== "origin-request,origin-response" ||
      associations.some(association => association.IncludeBody !== false)
    ) {
      throw new Error(
        `Production SSR association shape drifted for ${
          index === 0 ? "default" : "_next/data/*"
        } behavior.`
      );
    }
  });
  if (
    ownedAssociations.some(
      association => association.LambdaFunctionARN !== expectedDefaultVersionArn
    )
  ) {
    throw new Error(
      "Production SSR Lambda version drifted after authorization."
    );
  }
  const liveApiBehavior = (
    (config.CacheBehaviors && config.CacheBehaviors.Items) ||
    []
  ).find(behavior => behavior.PathPattern === API_PATH);
  if (expectedApiVersionArn === "none") {
    if (liveApiBehavior) {
      throw new Error(
        "Newsletter API behavior is present but the authorized baseline says none."
      );
    }
  } else {
    throw new Error(
      "Newsletter API behavior is outside the approved GTM release path."
    );
  }
  return ownedAssociations.length;
}

function replaceDefaultAssociations(config, replacementArn) {
  let replaced = 0;
  behaviorItems(config).forEach(behavior => {
    const associationBlock = behavior.LambdaFunctionAssociations;
    if (!associationBlock || !associationBlock.Items) return;
    associationBlock.Items = associationBlock.Items.map(association => {
      if (
        String(association.LambdaFunctionARN || "").startsWith(
          `${DEFAULT_FUNCTION_ARN}:`
        )
      ) {
        replaced += 1;
        return { ...association, LambdaFunctionARN: replacementArn };
      }
      return association;
    });
    associationBlock.Quantity = associationBlock.Items.length;
  });
  return replaced;
}

function configureProductionDistribution(
  config,
  expectedDefaultVersionArn,
  expectedApiVersionArn,
  newDefaultVersionArn
) {
  assertVersionArn(expectedDefaultVersionArn, DEFAULT_FUNCTION_ARN);
  assertVersionArn(newDefaultVersionArn, DEFAULT_FUNCTION_ARN);
  assertDistributionContract(
    config,
    expectedDefaultVersionArn,
    expectedApiVersionArn
  );

  const next = clone(config);
  const replaced = replaceDefaultAssociations(next, newDefaultVersionArn);
  if (replaced !== 4) {
    throw new Error(
      `Expected to replace four SSR associations, replaced ${replaced}.`
    );
  }

  const existing = (next.CacheBehaviors && next.CacheBehaviors.Items) || [];
  const kept = existing.filter(behavior => behavior.PathPattern !== API_PATH);
  next.CacheBehaviors = {
    Quantity: kept.length,
    Items: kept
  };
  return next;
}

function configureSanitizedRollback(config) {
  const next = clone(config);
  const replaced = replaceDefaultAssociations(next, SANITIZED_ROLLBACK_ARN);
  if (replaced !== 4) {
    throw new Error(
      `Sanitized rollback expected four SSR associations, found ${replaced}.`
    );
  }
  const existing = (next.CacheBehaviors && next.CacheBehaviors.Items) || [];
  const kept = existing.filter(behavior => behavior.PathPattern !== API_PATH);
  next.CacheBehaviors = { Quantity: kept.length, Items: kept };
  return next;
}

function zipDirectory(directory, zipPath) {
  // Node 24 on GHA: fs.rmSync(zipPath, { force: true }) can throw
  // TypeError: Cannot read properties of undefined (reading 'uid')
  // when the target does not exist (seen in FE prod run 31145148944).
  // Prefer exists + unlink for a single file path.
  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  } catch (err) {
    throw new Error(
      `Failed to remove existing zip ${zipPath}: ${
        err && err.message ? err.message : err
      }`
    );
  }
  run("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: directory });
}

async function build() {
  requireBuildContract();
  fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  console.log("production-deploy: starting edge package build");
  await buildDefaultEdgePackage();
  console.log("production-deploy: edge package build finished");
  if (!fs.existsSync(DEFAULT_LAMBDA_DIR) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      "Lambda@Edge build did not produce default-lambda and assets."
    );
  }
  console.log("production-deploy: scanning for embedded access keys");
  assertNoEmbeddedAccessKeys(BUILD_DIR);
  console.log("production-deploy: verifying exact built GTM contract");
  const gtmArtifact = assertBuiltGtmContract([DEFAULT_LAMBDA_DIR, ASSETS_DIR]);
  const gtmArtifactPath = path.join(RELEASE_DIR, "gtm-artifact.json");
  fs.writeFileSync(gtmArtifactPath, JSON.stringify(gtmArtifact, null, 2));
  const assetTree = candidateTree(ASSETS_DIR);
  const assetTreePath = path.join(RELEASE_DIR, "candidate-asset-tree.json");
  fs.writeFileSync(assetTreePath, `${JSON.stringify(assetTree, null, 2)}\n`);
  console.log("production-deploy: zipping default-lambda");
  zipDirectory(DEFAULT_LAMBDA_DIR, DEFAULT_ZIP);
  const metadata = {
    release_sha: process.env.DEPLOY_SHA,
    asset_tree_count: assetTree.length,
    asset_tree_sha256: fileSha256(assetTreePath),
    default_zip_code_sha256: zipCodeSha256(DEFAULT_ZIP),
    gtm_artifact_sha256: fileSha256(gtmArtifactPath),
    newsletter_api: "omitted",
    built_at: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(RELEASE_DIR, "build-metadata.json"),
    JSON.stringify(metadata, null, 2)
  );
  console.log(JSON.stringify(metadata));
}

function functionConfiguration(functionName, qualifier) {
  return runJson("aws", [
    "lambda",
    "get-function-configuration",
    "--region",
    REGION,
    "--function-name",
    functionName,
    ...(qualifier ? ["--qualifier", qualifier] : [])
  ]);
}

function publishLambda(functionName, zipPath, description) {
  run("aws", [
    "lambda",
    "update-function-code",
    "--region",
    REGION,
    "--function-name",
    functionName,
    "--zip-file",
    `fileb://${zipPath}`
  ]);
  run("aws", [
    "lambda",
    "wait",
    "function-updated",
    "--region",
    REGION,
    "--function-name",
    functionName
  ]);
  const expectedCodeSha = zipCodeSha256(zipPath);
  const latest = functionConfiguration(functionName);
  const baseArn = DEFAULT_FUNCTION_ARN;
  if (functionName !== DEFAULT_FUNCTION_NAME) {
    throw new Error("This release may publish only the frontend Lambda.");
  }
  assertFunctionContract(latest, baseArn, 3000);
  if (latest.CodeSha256 !== expectedCodeSha) {
    throw new Error(
      `${functionName} code checksum differs from the reviewed zip.`
    );
  }
  const published = runJson("aws", [
    "lambda",
    "publish-version",
    "--region",
    REGION,
    "--function-name",
    functionName,
    "--description",
    description
  ]);
  if (published.CodeSha256 !== expectedCodeSha) {
    throw new Error(
      `${functionName} published version checksum differs from the reviewed zip.`
    );
  }
  const arn = versionedArn(baseArn, published.Version);
  if (published.FunctionArn !== arn) {
    throw new Error(`${functionName} returned an unexpected published ARN.`);
  }
  return { arn, codeSha256: expectedCodeSha, version: published.Version };
}

function getDistributionConfig() {
  return runJson("aws", [
    "cloudfront",
    "get-distribution-config",
    "--id",
    DISTRIBUTION_ID
  ]);
}

function updateDistribution(config, etag, configPath) {
  fs.writeFileSync(configPath, JSON.stringify(config));
  run("aws", [
    "cloudfront",
    "update-distribution",
    "--id",
    DISTRIBUTION_ID,
    "--if-match",
    etag,
    "--distribution-config",
    `file://${configPath}`
  ]);
  run("aws", [
    "cloudfront",
    "wait",
    "distribution-deployed",
    "--id",
    DISTRIBUTION_ID
  ]);
}

function invalidate(paths = ["/*"]) {
  const id = run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    DISTRIBUTION_ID,
    "--paths",
    ...paths,
    "--query",
    "Invalidation.Id",
    "--output",
    "text"
  ]).trim();
  if (!id) throw new Error("CloudFront did not return an invalidation ID.");
  run("aws", [
    "cloudfront",
    "wait",
    "invalidation-completed",
    "--distribution-id",
    DISTRIBUTION_ID,
    "--id",
    id
  ]);
  return id;
}

function syncAssets() {
  run(
    "aws",
    [
      "s3",
      "sync",
      ASSETS_DIR,
      `s3://${BUCKET_NAME}`,
      "--region",
      REGION,
      "--no-follow-symlinks"
    ],
    { inherit: true }
  );
}

function encodeCopySource(key) {
  return `${BUCKET_NAME}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

function createS3RecoveryAdapter() {
  return {
    copy(sourceKey, destinationKey) {
      return runJson("aws", [
        "s3api",
        "copy-object",
        "--bucket",
        BUCKET_NAME,
        "--copy-source",
        encodeCopySource(sourceKey),
        "--key",
        destinationKey,
        "--metadata-directive",
        "COPY"
      ]);
    },
    getFile(key, destination) {
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
      run("aws", [
        "s3api",
        "get-object",
        "--bucket",
        BUCKET_NAME,
        "--key",
        key,
        destination
      ]);
    },
    head(key) {
      const result = spawnSync(
        "aws",
        [
          "s3api",
          "head-object",
          "--bucket",
          BUCKET_NAME,
          "--key",
          key,
          "--output",
          "json"
        ],
        { cwd: REPO_ROOT, encoding: "utf8", timeout: 30000 }
      );
      if (result.status === 0) return parseJsonOutput(result.stdout);
      const detail = `${result.stdout || ""}\n${result.stderr || ""}`;
      if (/\b404\b|Not Found|NoSuchKey/i.test(detail)) return null;
      throw new Error(
        `S3 head-object failed for ${key}: ${detail.trim().slice(0, 500)}`
      );
    },
    putFile(key, source, metadata) {
      const metadataArg = Object.keys(metadata)
        .sort()
        .map(name => `${name}=${metadata[name]}`)
        .join(",");
      return runJson("aws", [
        "s3api",
        "put-object",
        "--bucket",
        BUCKET_NAME,
        "--key",
        key,
        "--body",
        source,
        "--content-type",
        "application/json",
        "--metadata",
        metadataArg
      ]);
    }
  };
}

function captureObject(key, destination) {
  try {
    run("aws", [
      "s3api",
      "get-object",
      "--bucket",
      BUCKET_NAME,
      "--key",
      key,
      destination
    ]);
    return fs.readFileSync(destination, "utf8").trim();
  } catch (error) {
    return null;
  }
}

function releaseShaFromHtml(body) {
  return (
    (String(body).match(
      /<meta\b[^>]*name=["']hecmedia-deploy-sha["'][^>]*content=["']([0-9a-f]{40})["'][^>]*>/i
    ) || [])[1] || ""
  );
}

function captureHomepage(destination, options = {}) {
  const {
    expectGtm = false,
    expectedReleaseSha,
    gtmMode = expectGtm ? "present" : "absent",
    url = "https://hecmedia.org/"
  } = options;
  if (!["absent", "either", "present"].includes(gtmMode)) {
    throw new Error(`Invalid homepage GTM verification mode: ${gtmMode}.`);
  }
  run("curl", [
    "--fail",
    "--silent",
    "--show-error",
    "--location",
    "--retry",
    "5",
    "--retry-all-errors",
    "--output",
    destination,
    url
  ]);
  const body = fs.readFileSync(destination, "utf8");
  const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || "";
  const releaseSha = releaseShaFromHtml(body);
  const gtmIds = Array.from(new Set(body.match(/\bGTM-[A-Z0-9]+\b/g) || []));
  const loaderNeedle = "www.googletagmanager.com/gtm.js?id=";
  const loaderCount = body.split(loaderNeedle).length - 1;
  const hasDataLayer = body.includes("dataLayer");
  if (!/HEC-TV/.test(title) || /undefined/i.test(title)) {
    throw new Error(
      `Production baseline homepage is not healthy: ${title || "missing title"}`
    );
  }
  if (
    !releaseSha ||
    (expectedReleaseSha && releaseSha !== expectedReleaseSha)
  ) {
    throw new Error(
      `Production homepage release SHA mismatch: ${releaseSha || "missing"}.`
    );
  }
  const exactGtmPresent =
    gtmIds.length === 1 &&
    gtmIds[0] === "GTM-57RZPNN" &&
    loaderCount === 1 &&
    hasDataLayer;
  const gtmAbsent = gtmIds.length === 0 && loaderCount === 0 && !hasDataLayer;
  if (
    (gtmMode === "present" && !exactGtmPresent) ||
    (gtmMode === "absent" && !gtmAbsent) ||
    (gtmMode === "either" && !exactGtmPresent && !gtmAbsent)
  ) {
    throw new Error(
      `Production homepage GTM rollback contract mismatch at ${url}.`
    );
  }
  const observedGtmMode = exactGtmPresent ? "present" : "absent";
  return {
    gtmIds,
    gtmMode: observedGtmMode,
    hasDataLayer,
    loaderCount,
    releaseSha,
    sha256: fileSha256(destination),
    title,
    url
  };
}

function assertHydratedNavigation(dom, route) {
  const navigation = String(dom || "").match(
    /<ul\b[^>]*class="[^"]*\btop-navigation\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i
  );
  if (!navigation || !/<li\b/i.test(navigation[1])) {
    throw new Error(
      `Hydrated production route ${route} has no primary navigation items.`
    );
  }
}

const PRODUCTION_MEDIA_HOSTS = new Set([
  "prd-hectv-wp-media.s3.us-east-2.amazonaws.com",
  "prod-wp.hectv.org",
  "prod-wp-ecs.hectv.org"
]);
const APPROVED_REMOTE_IMAGE_PREFIXES = new Map([
  ["asset.ytadvisors.com", ["/client-documents/hecmedia/media-library/"]],
  ["prd-hectv-wp-media.s3.us-east-2.amazonaws.com", ["/wp-content/uploads/"]],
  ["prod-wp.hectv.org", ["/wp-content/uploads/"]],
  ["prod-wp-ecs.hectv.org", ["/wp-content/uploads/"]]
]);
const HYDRATED_MEDIA_REQUIREMENTS = {
  "/": { minimum: 1, surface: "post-list" },
  "/category/films": { minimum: 1, surface: "post-list" },
  "/category/arts/two_on_the_aisle": {
    minimum: 1,
    surface: "post-list"
  },
  "/posts/hec-on-youtube": {
    minimum: 1,
    surface: "article-content"
  },
  "/newsletter": { minimum: 0 }
};
const HYDRATED_ROUTE_TITLES = {
  "/": "HEC-TV | Home",
  "/category/arts/two_on_the_aisle": "HEC-TV | Two_on_the_aisle",
  "/category/films": "HEC-TV | Films",
  "/newsletter": "HEC-TV | Newsletter Signup",
  "/posts/hec-on-youtube": "HEC on YouTube"
};

function extractRemoteImageUrls(dom) {
  const urls = [];
  const content = String(dom || "");
  const imagePattern = /<img\b[^>]*>/gi;
  let image = imagePattern.exec(content);

  while (image) {
    const attributePattern = /\b(src|srcset)=["']([^"']+)["']/gi;
    let attribute = attributePattern.exec(image[0]);
    while (attribute) {
      const rawValue = attribute[2].replace(/&amp;/g, "&");
      const candidates =
        attribute[1].toLowerCase() === "srcset"
          ? rawValue.split(",").map(value => value.trim().split(/\s+/)[0])
          : [rawValue.trim()];
      candidates.forEach(source => {
        if (/^https?:\/\//i.test(source) && !urls.includes(source)) {
          urls.push(source);
        }
      });
      attribute = attributePattern.exec(image[0]);
    }
    image = imagePattern.exec(content);
  }

  return urls;
}

function extractMediaVerificationSurface(dom, surface) {
  const content = String(dom || "");
  const escapedSurface = String(surface).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const openingPattern = new RegExp(
    `<([a-z][\\w:-]*)\\b[^>]*\\bdata-media-verification=["']${escapedSurface}["'][^>]*>`,
    "i"
  );
  const opening = openingPattern.exec(content);
  if (!opening) return "";

  const tagPattern = new RegExp(`<\\/?${opening[1]}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  let tag = tagPattern.exec(content);
  while (tag) {
    if (/^<\//.test(tag[0])) depth -= 1;
    else if (!/\/>$/.test(tag[0])) depth += 1;

    if (depth === 0) {
      return content.slice(opening.index, tagPattern.lastIndex);
    }
    tag = tagPattern.exec(content);
  }

  return "";
}

function isProductionMediaUrl(url) {
  try {
    const candidate = new URL(url);
    return (
      /^https?:$/.test(candidate.protocol) &&
      PRODUCTION_MEDIA_HOSTS.has(candidate.hostname) &&
      candidate.pathname.startsWith("/wp-content/uploads/")
    );
  } catch (error) {
    return false;
  }
}

function isApprovedRemoteImageUrl(url) {
  try {
    const candidate = new URL(url);
    return (
      candidate.protocol === "https:" &&
      !candidate.username &&
      !candidate.password &&
      (!candidate.port || candidate.port === "443") &&
      (APPROVED_REMOTE_IMAGE_PREFIXES.get(candidate.hostname) || []).some(
        prefix => candidate.pathname.startsWith(prefix)
      )
    );
  } catch (error) {
    return false;
  }
}

function assertHydratedImageSources(dom, route) {
  const requirement = HYDRATED_MEDIA_REQUIREMENTS[route] || { minimum: 0 };
  const verificationDom = requirement.surface
    ? extractMediaVerificationSurface(dom, requirement.surface)
    : dom;
  const imageUrls = extractRemoteImageUrls(dom);
  const mediaImageUrls = extractRemoteImageUrls(verificationDom).filter(
    isProductionMediaUrl
  );

  if (mediaImageUrls.length < requirement.minimum) {
    throw new Error(
      `Hydrated production route ${route} has ${
        mediaImageUrls.length
      } production media image candidate(s) in ${requirement.surface ||
        "the document"}; requires at least ${requirement.minimum}.`
    );
  }

  return {
    route,
    imageUrls,
    mediaImageUrls,
    minimumMediaImages: requirement.minimum,
    verificationSurface: requirement.surface || "document"
  };
}

function assertRemoteImageResponse(url, route, result) {
  const detail = String(result.stderr || "")
    .trim()
    .slice(0, 500);
  if (result.status !== 0) {
    throw new Error(
      `Hydrated production route ${route} has a broken image ${url}${
        detail ? `: ${detail}` : ""
      }`
    );
  }

  const [, contentType = ""] = String(result.stdout || "")
    .trim()
    .split("\t");
  if (!/^image\//i.test(contentType)) {
    throw new Error(
      `Hydrated production route ${route} image ${url} returned non-image content type ${contentType ||
        "unknown"}.`
    );
  }
}

function verifyRemoteImage(url, route) {
  if (!isApprovedRemoteImageUrl(url)) {
    throw new Error(
      `Hydrated production route ${route} rendered an unapproved remote image URL: ${url}`
    );
  }
  const result = spawnSync(
    "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--retry",
      "2",
      "--retry-all-errors",
      "--max-time",
      "20",
      "--range",
      "0-0",
      "--output",
      "/dev/null",
      "--write-out",
      "%{http_code}\t%{content_type}",
      url
    ],
    { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 }
  );
  assertRemoteImageResponse(url, route, result);
}

function assertHydratedSiteIdentity(dom, route) {
  const title =
    (String(dom || "").match(/<title>(.*?)<\/title>/i) || [])[1] || "";
  if (
    !title ||
    /undefined|\b404\b/i.test(title) ||
    />404 not found\.</i.test(dom)
  ) {
    throw new Error(
      `Hydrated production route ${route} rendered an invalid/error document.`
    );
  }
  if (!HYDRATED_ROUTE_TITLES[route] || title !== HYDRATED_ROUTE_TITLES[route]) {
    throw new Error(
      `Hydrated production route ${route} rendered unexpected identity ${title ||
        "missing"}.`
    );
  }
  if (route === "/" && !String(dom).includes("HEC-TV")) {
    throw new Error("Hydrated production homepage did not render HEC-TV.");
  }
  if (
    route === "/posts/hec-on-youtube" &&
    (!/HEC on YouTube/i.test(title) ||
      !/data-media-verification=["']article-content["']/i.test(dom))
  ) {
    throw new Error(
      "Hydrated production YouTube route did not render its article contract."
    );
  }
  if (
    ["/category/films", "/category/arts/two_on_the_aisle"].includes(route) &&
    !/data-media-verification=["']post-list["']/i.test(dom)
  ) {
    throw new Error(
      `Hydrated production route ${route} did not render its post-list contract.`
    );
  }
  if (
    route === "/newsletter" &&
    !/class=["'][^"']*newsletter-unavailable/i.test(dom)
  ) {
    throw new Error(
      "Hydrated production newsletter did not render the reviewed unavailable contract."
    );
  }
}

async function verifyHydratedRoutes(browserPath, expectedGtm) {
  const routes = Object.keys(HYDRATED_MEDIA_REQUIREMENTS);
  const verifiedImages = new Set();
  const mediaEvidence = [];
  const captures = await captureHydratedRoutes({
    browserPath,
    expectedGtm,
    gtmId: "GTM-57RZPNN",
    outputDir: RELEASE_DIR,
    routes
  });
  captures.forEach(capture => {
    const { dom, route } = capture;
    const logs = JSON.stringify({
      consoleErrors: capture.consoleErrors,
      pageErrors: capture.pageErrors
    });
    assertHydratedSiteIdentity(dom, route);
    assertHydratedNavigation(dom, route);
    const routeMediaEvidence = assertHydratedImageSources(dom, route);
    routeMediaEvidence.blockedThirdPartyCount = capture.blockedRequests.length;
    routeMediaEvidence.gtmLoaderRequests = capture.gtmLoaderRequests;
    routeMediaEvidence.dataLayer = capture.dataLayer;
    routeMediaEvidence.imageUrls.forEach(url => {
      if (!verifiedImages.has(url)) {
        verifyRemoteImage(url, route);
        verifiedImages.add(url);
      }
    });
    mediaEvidence.push(routeMediaEvidence);
    if (/incompatible-href-as|provided .as. value.*incompatible/i.test(logs)) {
      throw new Error(
        `Hydrated production route ${route} emitted a dynamic-route error.`
      );
    }
    if (
      /Uncaught (\(in promise\) )?TypeError|TypeError:|Uncaught Error/i.test(
        logs
      )
    ) {
      throw new Error(
        `Hydrated production route ${route} emitted an uncaught JavaScript error.`
      );
    }
  });
  fs.writeFileSync(
    path.join(RELEASE_DIR, "hydrated-media.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        uniqueImageCount: verifiedImages.size,
        routes: mediaEvidence
      },
      null,
      2
    )
  );
}

function writeEvidence(state) {
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(state, null, 2));
}

function sameDistributionConfig(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function captureHttpStatus(url) {
  return run("curl", [
    "--silent",
    "--show-error",
    "--location",
    "--retry",
    "3",
    "--retry-all-errors",
    "--output",
    "/dev/null",
    "--write-out",
    "%{http_code}",
    url
  ]).trim();
}

function verifyPublicAliasState(baselineReleaseSha, options = {}) {
  const { gtmMode = "absent", label = "rollback" } = options;
  if (!/^[a-z][a-z0-9-]*$/.test(label)) {
    throw new Error(`Invalid public-state evidence label: ${label}.`);
  }
  const checks = [];
  ["hecmedia.org", "www.hecmedia.org"].forEach((host, hostIndex) => {
    ["normal", "fresh"].forEach((mode, modeIndex) => {
      const suffix =
        mode === "fresh"
          ? `?hecmedia_rollback_verify=${Date.now()}-${hostIndex}-${modeIndex}`
          : "";
      const output = path.join(
        RELEASE_DIR,
        `${label}-${host.replace(/\./g, "-")}-${mode}.html`
      );
      checks.push(
        captureHomepage(output, {
          expectedReleaseSha: baselineReleaseSha,
          gtmMode,
          url: `https://${host}/${suffix}`
        })
      );
      const apiStatus = captureHttpStatus(
        `https://${host}/${API_PATH}${suffix}`
      );
      if (apiStatus !== "404") {
        throw new Error(
          `Sanitized rollback newsletter API remained reachable on ${host}: HTTP ${apiStatus}.`
        );
      }
      checks[checks.length - 1].newsletterApiStatus = Number(apiStatus);
      checks[checks.length - 1].mode = mode;
    });
  });
  return checks;
}

function verifyRollbackPublicState(baselineReleaseSha) {
  return verifyPublicAliasState(baselineReleaseSha, {
    gtmMode: "absent",
    label: "rollback"
  });
}

function verifySanitizedRollbackVersion() {
  const config = functionConfiguration(
    DEFAULT_FUNCTION_NAME,
    publishedVersionFromArn(SANITIZED_ROLLBACK_ARN)
  );
  assertFunctionContract(config, SANITIZED_ROLLBACK_ARN, 3000);
  if (
    config.FunctionArn !== SANITIZED_ROLLBACK_ARN ||
    config.CodeSha256 !== SANITIZED_ROLLBACK_CODE_SHA256
  ) {
    throw new Error(
      "Pinned sanitized rollback Lambda no longer matches its immutable checksum."
    );
  }
}

function applySanitizedRollback(state, options = {}) {
  const nextState = { ...state };
  const rollbackErrors = [];
  const {
    authorizedCurrentDistribution = null,
    baselineDistribution = null,
    baselineReleaseSha,
    candidateDistributionConfig = null,
    getDistribution = getDistributionConfig,
    invalidateCache = invalidate,
    persistState = writeEvidence,
    restoreDistribution = true,
    restoreS3 = restorePreimages,
    s3 = createS3RecoveryAdapter(),
    s3Manifest = null,
    updateCloudFront = updateDistribution,
    verifyPublicState = verifyRollbackPublicState
  } = options;
  if (restoreDistribution) {
    try {
      const current = getDistribution();
      if (
        baselineDistribution &&
        sameDistributionConfig(
          current.DistributionConfig,
          baselineDistribution.DistributionConfig
        )
      ) {
        nextState.rollback_distribution = "baseline-was-still-live";
      } else {
        let rollbackConfig;
        if (
          baselineDistribution &&
          candidateDistributionConfig &&
          sameDistributionConfig(
            current.DistributionConfig,
            candidateDistributionConfig
          )
        ) {
          rollbackConfig = clone(baselineDistribution.DistributionConfig);
        } else if (
          authorizedCurrentDistribution &&
          current.ETag === authorizedCurrentDistribution.ETag &&
          sameDistributionConfig(
            current.DistributionConfig,
            authorizedCurrentDistribution.DistributionConfig
          )
        ) {
          rollbackConfig = configureSanitizedRollback(
            current.DistributionConfig
          );
        } else {
          throw new Error(
            "CloudFront is neither the exact baseline nor exact candidate/authorized rollback state; refusing recovery mutation."
          );
        }
        const rollbackPath = path.join(
          RELEASE_DIR,
          "cloudfront-sanitized-rollback.json"
        );
        updateCloudFront(rollbackConfig, current.ETag, rollbackPath);
        nextState.rollback_distribution = "sanitized-version-150-restored";
      }
    } catch (error) {
      nextState.rollback_distribution = "restore-failed";
      rollbackErrors.push(error);
    }
  } else {
    nextState.rollback_distribution = "unchanged-before-cutover";
  }
  if (s3Manifest) {
    try {
      nextState.rollback_s3_restored = restoreS3(s3Manifest, s3, RELEASE_DIR);
    } catch (error) {
      nextState.rollback_s3_restored =
        (error.restoreResult && error.restoreResult.restored) || [];
      nextState.rollback_s3_failures =
        (error.restoreResult && error.restoreResult.failures) || [];
      nextState.rollback_s3_error = error.message || String(error);
      rollbackErrors.push(error);
    }
  } else {
    nextState.rollback_s3_restored = [];
  }
  if (rollbackErrors.length === 0) {
    try {
      const restoredDistribution = getDistribution();
      assertDistributionContract(
        restoredDistribution.DistributionConfig,
        SANITIZED_ROLLBACK_ARN,
        "none"
      );
      nextState.rollback_cloudfront_verified_etag = restoredDistribution.ETag;
      nextState.rollback_invalidation_id = invalidateCache(["/*"]);
      nextState.rollback_public_checks = verifyPublicState(baselineReleaseSha);
    } catch (error) {
      nextState.rollback_final_verification_error =
        error.message || String(error);
      rollbackErrors.push(error);
    }
  } else {
    nextState.rollback_invalidation_id = null;
    nextState.rollback_invalidation_skipped =
      "Required CloudFront/S3 restoration was incomplete.";
  }
  nextState.rollback_outcome =
    rollbackErrors.length === 0
      ? "sanitized-state-restored"
      : "rollback-incomplete";
  persistState(nextState);
  if (rollbackErrors.length > 0) {
    const rollbackError = new Error(
      `Rollback had ${rollbackErrors.length} failure(s): ${rollbackErrors
        .map(error => error.message || String(error))
        .join(" | ")}`
    );
    rollbackError.rollbackState = nextState;
    throw rollbackError;
  }
  return nextState;
}

function ensureBuildArtifacts() {
  const gtmArtifactPath = path.join(RELEASE_DIR, "gtm-artifact.json");
  const assetTreePath = path.join(RELEASE_DIR, "candidate-asset-tree.json");
  [DEFAULT_ZIP, ASSETS_DIR, assetTreePath, gtmArtifactPath].forEach(entry => {
    if (!fs.existsSync(entry))
      throw new Error(`Production build artifact is missing: ${entry}`);
  });
  const metadata = JSON.parse(
    fs.readFileSync(path.join(RELEASE_DIR, "build-metadata.json"), "utf8")
  );
  const expectedAssetTree = JSON.parse(fs.readFileSync(assetTreePath, "utf8"));
  const actualAssetTree = candidateTree(ASSETS_DIR);
  if (
    metadata.release_sha !== process.env.DEPLOY_SHA ||
    metadata.asset_tree_count !== actualAssetTree.length ||
    metadata.asset_tree_sha256 !== fileSha256(assetTreePath) ||
    JSON.stringify(expectedAssetTree) !== JSON.stringify(actualAssetTree) ||
    metadata.default_zip_code_sha256 !== zipCodeSha256(DEFAULT_ZIP) ||
    metadata.gtm_artifact_sha256 !== fileSha256(gtmArtifactPath) ||
    metadata.newsletter_api !== "omitted"
  ) {
    throw new Error(
      "Production build metadata does not match the release artifacts."
    );
  }
  return metadata;
}

function assertDistributionContractWithRelease(
  config,
  defaultVersionArn,
  apiVersionArn
) {
  assertDistributionContract(config, defaultVersionArn, apiVersionArn);
}

async function deploy() {
  assertGovernedDeployContext(process.env, "deploy");
  requireBuildContract();
  const metadata = ensureBuildArtifacts();
  const expectedEtag = process.env.EXPECTED_CLOUDFRONT_ETAG || "";
  const expectedDefaultArn =
    process.env.EXPECTED_DEFAULT_LAMBDA_VERSION_ARN || "";
  const expectedDefaultCodeSha =
    process.env.EXPECTED_DEFAULT_LAMBDA_CODE_SHA256 || "";
  const expectedApiArn = process.env.EXPECTED_API_LAMBDA_VERSION_ARN || "";
  assertVersionArn(expectedDefaultArn, DEFAULT_FUNCTION_ARN);
  if (expectedApiArn !== "none") {
    throw new Error(
      "EXPECTED_API_LAMBDA_VERSION_ARN must equal none; newsletter API reactivation is outside this release."
    );
  }
  if (!/^[-A-Za-z0-9+/]{20,}={0,2}$/.test(expectedDefaultCodeSha)) {
    throw new Error("EXPECTED_DEFAULT_LAMBDA_CODE_SHA256 is invalid.");
  }

  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const baseline = getDistributionConfig();
  if (baseline.ETag !== expectedEtag) {
    throw new Error(
      "CloudFront ETag changed after authorization; refusing release."
    );
  }
  assertDistributionContract(
    baseline.DistributionConfig,
    expectedDefaultArn,
    expectedApiArn
  );
  const baselineFunction = functionConfiguration(
    DEFAULT_FUNCTION_NAME,
    expectedDefaultArn.split(":").pop()
  );
  // Baseline published version may predate the nodejs24 upgrade.
  assertFunctionContract(baselineFunction, expectedDefaultArn, 3000, {
    allowedRuntimes: ["nodejs12.x", "nodejs24.x"]
  });
  if (baselineFunction.CodeSha256 !== expectedDefaultCodeSha) {
    throw new Error("Baseline Lambda checksum changed after authorization.");
  }
  assertFunctionContract(
    functionConfiguration(DEFAULT_FUNCTION_NAME),
    DEFAULT_FUNCTION_ARN,
    3000
  );
  verifySanitizedRollbackVersion();

  const baselineConfigPath = path.join(RELEASE_DIR, "cloudfront-before.json");
  fs.writeFileSync(baselineConfigPath, JSON.stringify(baseline, null, 2));
  // Empty stdout = never configured. Versioning is a pre-existing safety gate;
  // this release is not authorized to change bucket configuration.
  const bucketVersioning = runJson(
    "aws",
    ["s3api", "get-bucket-versioning", "--bucket", BUCKET_NAME],
    { allowEmptyObject: true }
  );
  const baselineBuildId = captureObject(
    "BUILD_ID",
    path.join(RELEASE_DIR, "s3-build-id-before.txt")
  );
  const baselineHomepage = captureHomepage(
    path.join(RELEASE_DIR, "homepage-before.html"),
    { gtmMode: "either" }
  );
  const baselinePublicChecks = verifyPublicAliasState(
    baselineHomepage.releaseSha,
    { gtmMode: baselineHomepage.gtmMode, label: "baseline" }
  );
  const expectedReleaseTag = `hecmedia-production-${process.env.DEPLOY_SHA.slice(
    0,
    12
  )}`;
  let state = {
    target: "https://hecmedia.org",
    outcome: "in_progress",
    release_sha: process.env.DEPLOY_SHA,
    request_task_id: process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID,
    github_run_id: process.env.GITHUB_RUN_ID,
    github_run_attempt: process.env.GITHUB_RUN_ATTEMPT,
    dispatch_actor: process.env.GITHUB_ACTOR,
    baseline_cloudfront_etag: baseline.ETag,
    baseline_default_lambda_arn: expectedDefaultArn,
    baseline_default_lambda_code_sha256: expectedDefaultCodeSha,
    baseline_api_lambda_arn: expectedApiArn,
    sanitized_rollback_lambda_arn: SANITIZED_ROLLBACK_ARN,
    sanitized_rollback_code_sha256: SANITIZED_ROLLBACK_CODE_SHA256,
    baseline_bucket_versioning: bucketVersioning.Status || "Disabled",
    baseline_s3_build_id: baselineBuildId,
    baseline_homepage: baselineHomepage,
    baseline_public_checks: baselinePublicChecks,
    build: metadata,
    newsletter_api: "omitted",
    rollback_outcome: "not-needed",
    expected_release_tag: expectedReleaseTag,
    generated_at: new Date().toISOString()
  };
  writeEvidence(state);

  const s3 = createS3RecoveryAdapter();
  let s3Recovery = null;
  let candidateS3WriteMayHaveOccurred = false;
  let cloudFrontUpdateStarted = false;
  let candidateDistributionConfig = null;
  try {
    if (bucketVersioning.Status !== "Enabled") {
      throw new Error(
        "Production S3 versioning must already be enabled before deployment."
      );
    }

    state.gtm_pre_mutation = await verifyPublicResource({
      expectedCanonicalSha256: process.env.EXPECTED_GTM_CANONICAL_SHA256,
      expectedCounts: parseExpectedCounts(process.env.EXPECTED_GTM_COUNTS),
      expectedInventorySha256: process.env.EXPECTED_GTM_INVENTORY_SHA256,
      expectedResourceVersion: process.env.EXPECTED_GTM_RESOURCE_VERSION,
      outputDir: RELEASE_DIR,
      phase: "pre-mutation"
    });
    writeEvidence(state);

    s3Recovery = preparePreimages({
      assetsDir: ASSETS_DIR,
      binding: {
        baselineEtag: baseline.ETag,
        baselineReleaseSha: baselineHomepage.releaseSha,
        releaseSha: process.env.DEPLOY_SHA,
        runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT,
        taskId: process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID
      },
      bucket: BUCKET_NAME,
      outputDir: RELEASE_DIR,
      s3
    });
    state.s3_preimage_manifest_key = s3Recovery.manifest.manifestKey;
    state.s3_preimage_manifest_sha256 = s3Recovery.manifestSha256;
    state.s3_candidate_key_count = s3Recovery.manifest.entries.length;
    writeEvidence(state);

    assertCandidateTree(s3Recovery.manifest, ASSETS_DIR);
    state.s3_remote_baseline_verified = assertRemoteBaseline(
      s3Recovery.manifest,
      s3,
      RELEASE_DIR
    );
    writeEvidence(state);
    candidateS3WriteMayHaveOccurred = true;
    state.s3_write_fence_crossed_at = new Date().toISOString();
    writeEvidence(state);
    syncAssets();
    state.s3_candidate_upload_verified = assertUploadedCandidates(
      s3Recovery.manifest,
      s3,
      RELEASE_DIR
    );
    writeEvidence(state);
    const shortSha = process.env.DEPLOY_SHA.slice(0, 12);
    const defaultPublished = publishLambda(
      DEFAULT_FUNCTION_NAME,
      DEFAULT_ZIP,
      `HEC production ${shortSha} task ${process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID}`
    );
    state.new_default_lambda = defaultPublished;
    writeEvidence(state);

    const beforeCutover = getDistributionConfig();
    if (
      beforeCutover.ETag !== baseline.ETag ||
      JSON.stringify(beforeCutover.DistributionConfig) !==
        JSON.stringify(baseline.DistributionConfig)
    ) {
      throw new Error(
        "CloudFront changed while artifacts were publishing; refusing cutover."
      );
    }
    candidateDistributionConfig = configureProductionDistribution(
      beforeCutover.DistributionConfig,
      expectedDefaultArn,
      expectedApiArn,
      defaultPublished.arn
    );
    cloudFrontUpdateStarted = true;
    state.cloudfront_update_started_at = new Date().toISOString();
    state.candidate_cloudfront_config_sha256 = crypto
      .createHash("sha256")
      .update(JSON.stringify(candidateDistributionConfig))
      .digest("hex");
    writeEvidence(state);
    updateDistribution(
      candidateDistributionConfig,
      beforeCutover.ETag,
      path.join(RELEASE_DIR, "cloudfront-release.json")
    );
    state.invalidation_id = invalidate(["/*"]);

    run("node", [path.join(REPO_ROOT, "scripts", "verify-production.js")], {
      env: {
        ...process.env,
        PRODUCTION_SITE_URL: "https://hecmedia.org",
        CLOUDFRONT_ALIASES: "hecmedia.org,www.hecmedia.org"
      }
    });
    state.gtm_post_cutover = await verifyPublicResource({
      expectedCanonicalSha256: process.env.EXPECTED_GTM_CANONICAL_SHA256,
      expectedCounts: parseExpectedCounts(process.env.EXPECTED_GTM_COUNTS),
      expectedInventorySha256: process.env.EXPECTED_GTM_INVENTORY_SHA256,
      expectedResourceVersion: process.env.EXPECTED_GTM_RESOURCE_VERSION,
      outputDir: RELEASE_DIR,
      phase: "post-cutover"
    });
    await verifyHydratedRoutes(process.env.BROWSER_BIN, {
      canonicalSha256: process.env.EXPECTED_GTM_CANONICAL_SHA256,
      counts: parseExpectedCounts(process.env.EXPECTED_GTM_COUNTS),
      inventorySha256: process.env.EXPECTED_GTM_INVENTORY_SHA256,
      resourceVersion: process.env.EXPECTED_GTM_RESOURCE_VERSION
    });

    const live = getDistributionConfig();
    assertDistributionContractWithRelease(
      live.DistributionConfig,
      defaultPublished.arn,
      "none"
    );
    state.live_cloudfront_etag = live.ETag;
    state.outcome = "verified_pending_release_tag";
    state.completed_at = new Date().toISOString();
    writeEvidence(state);
    console.log(
      `HEC frontend production release verified: ${defaultPublished.arn}; newsletter API omitted`
    );
  } catch (error) {
    state.outcome = "failed";
    state.error = error.message || String(error);
    if (cloudFrontUpdateStarted || candidateS3WriteMayHaveOccurred) {
      try {
        state = applySanitizedRollback(state, {
          baselineDistribution: baseline,
          baselineReleaseSha: baselineHomepage.releaseSha,
          candidateDistributionConfig,
          restoreDistribution: cloudFrontUpdateStarted,
          s3,
          s3Manifest:
            candidateS3WriteMayHaveOccurred && s3Recovery
              ? s3Recovery.manifest
              : null
        });
      } catch (rollbackError) {
        state = rollbackError.rollbackState || state;
        state.rollback_outcome = "rollback-failed";
        state.rollback_error = rollbackError.message || String(rollbackError);
        state.completed_at = new Date().toISOString();
        writeEvidence(state);
        const combinedError = new Error(
          `Deployment failed (${error.message ||
            error}); automatic recovery also failed (${rollbackError.message ||
            rollbackError}).`
        );
        combinedError.deployError = error;
        combinedError.rollbackError = rollbackError;
        throw combinedError;
      }
    } else {
      state.rollback_outcome = "no-candidate-write-or-cutover-started";
    }
    state.completed_at = new Date().toISOString();
    writeEvidence(state);
    throw error;
  }
}

function recoverSameAttempt() {
  assertGovernedDeployContext(process.env, "deploy");
  if (!fs.existsSync(EVIDENCE_PATH)) {
    return { emergency_recovery: "not-needed-before-controller" };
  }
  let state = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
  if (!state.s3_write_fence_crossed_at && !state.cloudfront_update_started_at) {
    state.emergency_recovery = "not-needed-before-write-fence";
    writeEvidence(state);
    return state;
  }
  const manifestPath = path.join(RELEASE_DIR, "s3-preimage-manifest.json");
  const baselinePath = path.join(RELEASE_DIR, "cloudfront-before.json");
  const candidatePath = path.join(RELEASE_DIR, "cloudfront-release.json");
  [manifestPath, baselinePath].forEach(requiredPath => {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(
        `Emergency recovery is missing required evidence: ${requiredPath}`
      );
    }
  });
  if (
    !state.s3_preimage_manifest_sha256 ||
    fileSha256(manifestPath) !== state.s3_preimage_manifest_sha256
  ) {
    throw new Error("Emergency recovery manifest checksum mismatch.");
  }
  const manifest = validateManifest(
    JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    {
      baselineEtag: state.baseline_cloudfront_etag,
      baselineReleaseSha: state.baseline_homepage.releaseSha,
      bucket: BUCKET_NAME,
      releaseSha: process.env.DEPLOY_SHA,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      runId: process.env.GITHUB_RUN_ID,
      taskId: process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID
    }
  );
  const baselineDistribution = JSON.parse(
    fs.readFileSync(baselinePath, "utf8")
  );
  const candidateDistributionConfig = fs.existsSync(candidatePath)
    ? JSON.parse(fs.readFileSync(candidatePath, "utf8"))
    : null;
  state.emergency_recovery_started_at = new Date().toISOString();
  writeEvidence(state);
  state = applySanitizedRollback(state, {
    baselineDistribution,
    baselineReleaseSha: manifest.binding.baselineReleaseSha,
    candidateDistributionConfig,
    restoreDistribution: Boolean(state.cloudfront_update_started_at),
    s3: createS3RecoveryAdapter(),
    s3Manifest: manifest
  });
  state.emergency_recovery = "complete";
  state.emergency_recovery_completed_at = new Date().toISOString();
  writeEvidence(state);
  return state;
}

function rollback() {
  assertGovernedDeployContext(process.env, "rollback");
  verifySanitizedRollbackVersion();
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const s3 = createS3RecoveryAdapter();
  const s3Manifest = loadBoundManifest({
    expectedBaselineEtag: process.env.SOURCE_DEPLOY_BASELINE_ETAG,
    expectedBaselineReleaseSha: process.env.SOURCE_DEPLOY_BASELINE_RELEASE_SHA,
    expectedBucket: BUCKET_NAME,
    expectedManifestSha256: process.env.PREIMAGE_MANIFEST_SHA256,
    expectedReleaseSha: process.env.SOURCE_DEPLOY_RELEASE_SHA,
    expectedRunId: process.env.SOURCE_DEPLOY_RUN_ID,
    expectedRunAttempt: process.env.SOURCE_DEPLOY_RUN_ATTEMPT,
    expectedTaskId: process.env.SOURCE_DEPLOY_TASK_ID,
    localPath: path.join(RELEASE_DIR, "manual-rollback-s3-manifest.json"),
    manifestKey: process.env.PREIMAGE_MANIFEST_KEY,
    s3
  });
  const expectedCurrentEtag = process.env.EXPECTED_CLOUDFRONT_ETAG || "";
  const expectedCurrentDefaultArn =
    process.env.EXPECTED_DEFAULT_LAMBDA_VERSION_ARN || "";
  const expectedCurrentCodeSha =
    process.env.EXPECTED_DEFAULT_LAMBDA_CODE_SHA256 || "";
  if (process.env.EXPECTED_API_LAMBDA_VERSION_ARN !== "none") {
    throw new Error(
      "Manual rollback requires the currently absent newsletter API behavior."
    );
  }
  assertVersionArn(expectedCurrentDefaultArn, DEFAULT_FUNCTION_ARN);
  const authorizedCurrentDistribution = getDistributionConfig();
  if (authorizedCurrentDistribution.ETag !== expectedCurrentEtag) {
    throw new Error(
      "CloudFront ETag changed after rollback authorization; refusing mutation."
    );
  }
  assertDistributionContract(
    authorizedCurrentDistribution.DistributionConfig,
    expectedCurrentDefaultArn,
    "none"
  );
  const currentFunction = functionConfiguration(
    DEFAULT_FUNCTION_NAME,
    publishedVersionFromArn(expectedCurrentDefaultArn)
  );
  assertFunctionContract(currentFunction, expectedCurrentDefaultArn, 3000, {
    allowedRuntimes: ["nodejs12.x", "nodejs24.x"]
  });
  if (currentFunction.CodeSha256 !== expectedCurrentCodeSha) {
    throw new Error(
      "Current Lambda checksum changed after rollback authorization."
    );
  }
  const currentHomepage = captureHomepage(
    path.join(RELEASE_DIR, "manual-rollback-current-home.html"),
    {
      expectGtm: true,
      expectedReleaseSha: process.env.SOURCE_DEPLOY_RELEASE_SHA
    }
  );
  const currentCandidateObjects = assertUploadedCandidates(
    s3Manifest,
    s3,
    RELEASE_DIR
  );
  let state = {};
  if (fs.existsSync(EVIDENCE_PATH)) {
    state = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
  }
  state.outcome = "manual_rollback";
  state.release_sha = process.env.DEPLOY_SHA;
  state.request_task_id = process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID;
  state.source_deploy_task_id = process.env.SOURCE_DEPLOY_TASK_ID;
  state.source_deploy_run_id = process.env.SOURCE_DEPLOY_RUN_ID;
  state.source_deploy_run_attempt = process.env.SOURCE_DEPLOY_RUN_ATTEMPT;
  state.source_deploy_release_sha = process.env.SOURCE_DEPLOY_RELEASE_SHA;
  state.source_deploy_baseline_etag = process.env.SOURCE_DEPLOY_BASELINE_ETAG;
  state.source_deploy_baseline_release_sha =
    process.env.SOURCE_DEPLOY_BASELINE_RELEASE_SHA;
  state.authorized_current_cloudfront_etag = expectedCurrentEtag;
  state.authorized_current_default_lambda_arn = expectedCurrentDefaultArn;
  state.authorized_current_default_lambda_code_sha256 = expectedCurrentCodeSha;
  state.authorized_current_homepage = currentHomepage;
  state.authorized_current_candidate_objects = currentCandidateObjects;
  state.s3_preimage_manifest_key = process.env.PREIMAGE_MANIFEST_KEY;
  state.s3_preimage_manifest_sha256 = process.env.PREIMAGE_MANIFEST_SHA256;
  state = applySanitizedRollback(state, {
    authorizedCurrentDistribution,
    baselineReleaseSha: process.env.SOURCE_DEPLOY_BASELINE_RELEASE_SHA,
    s3,
    s3Manifest
  });
  return state;
}

async function main() {
  const command = process.argv[2];
  if (command === "build") return build();
  if (command === "deploy") return deploy();
  if (command === "recover") return recoverSameAttempt();
  if (command === "rollback") return rollback();
  throw new Error(
    `Unknown command "${command}". Use build, deploy, recover, or rollback.`
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  API_PATH,
  SANITIZED_ROLLBACK_ARN,
  SANITIZED_ROLLBACK_CODE_SHA256,
  applySanitizedRollback,
  assertDistributionContract,
  assertBuiltGtmContract,
  assertFunctionContract,
  assertGovernedDeployContext,
  assertHydratedImageSources,
  assertHydratedNavigation,
  assertHydratedSiteIdentity,
  assertRemoteImageResponse,
  configureProductionDistribution,
  configureSanitizedRollback,
  extractRemoteImageUrls,
  isApprovedRemoteImageUrl,
  parseJsonOutput,
  publishedVersionFromArn,
  requireBuildContract
};
