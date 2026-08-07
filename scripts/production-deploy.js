#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { build: buildDefaultEdgePackage } = require("./staging-deploy");

const REGION = "us-east-1";
const ACCOUNT_ID = "850335719356";
const DISTRIBUTION_ID = "E2QXRSF2W55RTS";
const BUCKET_NAME = "x2l4ew-k0m7umi";
const ORIGIN_ID = "x2l4ew-k0m7umi";
const DEFAULT_FUNCTION_NAME = "x2l4ew-l5vb7pd";
const API_FUNCTION_NAME = "x2l4ew-api";
const DEFAULT_FUNCTION_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${DEFAULT_FUNCTION_NAME}`;
const API_FUNCTION_ARN = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${API_FUNCTION_NAME}`;
const EDGE_EXECUTION_ROLE = "arn:aws:iam::850335719356:role/x2l4ew-0kb1zus";
const SANITIZED_ROLLBACK_ARN = `${DEFAULT_FUNCTION_ARN}:147`;
const SANITIZED_ROLLBACK_CODE_SHA256 =
  "bK0kKF/F6KYZJp75jfK+kZ6swsA1yqljdpusPoBgAek=";
const API_PATH = "api/newsletter/subscribe";
const REPO_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(REPO_ROOT, ".serverless_nextjs");
const ASSETS_DIR = path.join(BUILD_DIR, "assets");
const DEFAULT_LAMBDA_DIR = path.join(BUILD_DIR, "default-lambda");
const RELEASE_DIR = path.join(REPO_ROOT, ".production-release");
const DEFAULT_ZIP = path.join(RELEASE_DIR, "default-lambda.zip");
const API_ZIP = path.join(RELEASE_DIR, "api-lambda.zip");
const API_EDGE_SOURCE = path.join(
  REPO_ROOT,
  "scripts",
  "edge-handlers",
  "newsletter-api-edge.js"
);
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
 * never been configured — treat that as {} so deploy can enable versioning.
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
        `listFiles failed on ${entryPath}: ${err && err.message ? err.message : err}`
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

function assertFunctionContract(config, expectedArn, expectedMemory, options = {}) {
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
        ` (runtime=${config && config.Runtime}, allowed=${allowedRuntimes.join(",")}).`
    );
  }
}

function requireBuildContract(env = process.env) {
  const exact = {
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    WP_HOST: "https://prod-wp.hectv.org",
    SITE_HOST: "https://hecmedia.org",
    HECMEDIA_NO_SEND_FORMS: "false",
    HECMEDIA_EDGE_API: "true",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_MODERN_WPGRAPHQL: "true"
  };
  Object.entries(exact).forEach(([name, value]) => {
    if (env[name] !== value) {
      throw new Error(`${name} must equal ${value} for production.`);
    }
  });
  if (!/^[0-9a-f]{40}$/.test(env.DEPLOY_SHA || "")) {
    throw new Error("DEPLOY_SHA must be an exact 40-character commit SHA.");
  }
  if (!/^6L[A-Za-z0-9_-]{30,}$/.test(env.RE_CAPTCHA_SITE_KEY || "")) {
    throw new Error(
      "RE_CAPTCHA_SITE_KEY must be the public production site key."
    );
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
  const origins = (config.Origins && config.Origins.Items) || [];
  if (
    origins.length !== 1 ||
    origins[0].Id !== ORIGIN_ID ||
    origins[0].DomainName !== `${BUCKET_NAME}.s3.us-east-1.amazonaws.com`
  ) {
    throw new Error("Production S3 origin contract changed; refusing release.");
  }

  const ownedAssociations = defaultAssociations(config).filter(association =>
    String(association.LambdaFunctionARN || "").startsWith(
      `${DEFAULT_FUNCTION_ARN}:`
    )
  );
  if (ownedAssociations.length !== 4) {
    throw new Error(
      `Expected four production SSR Lambda associations, found ${ownedAssociations.length}.`
    );
  }
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
    assertVersionArn(expectedApiVersionArn, API_FUNCTION_ARN);
    const apiAssociations =
      liveApiBehavior && liveApiBehavior.LambdaFunctionAssociations
        ? liveApiBehavior.LambdaFunctionAssociations.Items || []
        : [];
    if (
      apiAssociations.length !== 1 ||
      apiAssociations[0].LambdaFunctionARN !== expectedApiVersionArn ||
      apiAssociations[0].EventType !== "origin-request" ||
      apiAssociations[0].IncludeBody !== true
    ) {
      throw new Error("Newsletter API baseline drifted after authorization.");
    }
  }
  return ownedAssociations.length;
}

function apiBehavior(defaultBehavior, apiVersionArn) {
  assertVersionArn(apiVersionArn, API_FUNCTION_ARN);
  const behavior = clone(defaultBehavior);
  behavior.PathPattern = API_PATH;
  behavior.TargetOriginId = ORIGIN_ID;
  behavior.AllowedMethods = {
    Quantity: 7,
    Items: ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"],
    CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
  };
  behavior.LambdaFunctionAssociations = {
    Quantity: 1,
    Items: [
      {
        LambdaFunctionARN: apiVersionArn,
        EventType: "origin-request",
        IncludeBody: true
      }
    ]
  };
  behavior.MinTTL = 0;
  behavior.DefaultTTL = 0;
  behavior.MaxTTL = 0;
  behavior.Compress = true;
  behavior.ForwardedValues = {
    QueryString: false,
    Cookies: { Forward: "none" },
    Headers: { Quantity: 0 },
    QueryStringCacheKeys: { Quantity: 0 }
  };
  return behavior;
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
  newDefaultVersionArn,
  newApiVersionArn
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
  const unmanaged = existing.filter(
    behavior => behavior.PathPattern !== API_PATH
  );
  next.CacheBehaviors = {
    Quantity: unmanaged.length + 1,
    Items: [
      apiBehavior(next.DefaultCacheBehavior, newApiVersionArn),
      ...unmanaged
    ]
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
      `Failed to remove existing zip ${zipPath}: ${err && err.message ? err.message : err}`
    );
  }
  run("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: directory });
}

function packageApiEdge() {
  const apiDir = path.join(RELEASE_DIR, "api-edge");
  fs.mkdirSync(apiDir, { recursive: true });
  fs.copyFileSync(API_EDGE_SOURCE, path.join(apiDir, "index.js"));
  assertNoEmbeddedAccessKeys(apiDir);
  zipDirectory(apiDir, API_ZIP);
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
  console.log("production-deploy: zipping default-lambda");
  zipDirectory(DEFAULT_LAMBDA_DIR, DEFAULT_ZIP);
  console.log("production-deploy: packaging api edge");
  packageApiEdge();
  const metadata = {
    release_sha: process.env.DEPLOY_SHA,
    default_zip_code_sha256: zipCodeSha256(DEFAULT_ZIP),
    api_zip_code_sha256: zipCodeSha256(API_ZIP),
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
  const baseArn =
    functionName === DEFAULT_FUNCTION_NAME
      ? DEFAULT_FUNCTION_ARN
      : API_FUNCTION_ARN;
  assertFunctionContract(
    latest,
    baseArn,
    functionName === DEFAULT_FUNCTION_NAME ? 3000 : 1024
  );
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
    ["s3", "sync", ASSETS_DIR, `s3://${BUCKET_NAME}`, "--region", REGION],
    { inherit: true }
  );
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

function captureHomepage(destination) {
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
    "https://hecmedia.org/"
  ]);
  const body = fs.readFileSync(destination, "utf8");
  const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || "";
  if (!/HEC-TV/.test(title) || /undefined/i.test(title)) {
    throw new Error(
      `Production baseline homepage is not healthy: ${title || "missing title"}`
    );
  }
  return { title, sha256: fileSha256(destination) };
}

function verifyHydratedRoutes(browserPath) {
  if (!browserPath || !fs.existsSync(browserPath)) {
    throw new Error(
      "BROWSER_BIN must name an installed Chrome or Chromium binary."
    );
  }
  const routes = [
    "/",
    "/category/films",
    "/category/arts/two_on_the_aisle",
    "/newsletter"
  ];
  routes.forEach((route, index) => {
    const result = spawnSync(
      browserPath,
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--enable-logging=stderr",
        "--v=1",
        "--virtual-time-budget=5000",
        "--dump-dom",
        `https://hecmedia.org${route}`
      ],
      { encoding: "utf8", timeout: 60000, maxBuffer: 20 * 1024 * 1024 }
    );
    const slug =
      index === 0 ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
    fs.writeFileSync(
      path.join(RELEASE_DIR, `hydrated-${slug}.html`),
      result.stdout || ""
    );
    fs.writeFileSync(
      path.join(RELEASE_DIR, `browser-${slug}.log`),
      result.stderr || ""
    );
    if (result.status !== 0) {
      throw new Error(
        `Hydrated production route ${route} exited ${result.status}.`
      );
    }
    const dom = result.stdout || "";
    const logs = result.stderr || "";
    if (!dom.includes("HEC-TV") || />404 not found\.</i.test(dom)) {
      throw new Error(
        `Hydrated production route ${route} did not render the HEC site.`
      );
    }
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
}

function writeEvidence(state) {
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(state, null, 2));
}

function verifySanitizedRollbackVersion() {
  const config = functionConfiguration(DEFAULT_FUNCTION_NAME, "147");
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

function applySanitizedRollback(state) {
  const nextState = { ...state };
  const current = getDistributionConfig();
  const rollbackConfig = configureSanitizedRollback(current.DistributionConfig);
  const rollbackPath = path.join(
    RELEASE_DIR,
    "cloudfront-sanitized-rollback.json"
  );
  updateDistribution(rollbackConfig, current.ETag, rollbackPath);
  nextState.rollback_invalidation_id = invalidate(["/*"]);
  const rollbackHome = path.join(RELEASE_DIR, "rollback-home.html");
  nextState.rollback_home = captureHomepage(rollbackHome);
  nextState.rollback_outcome = "sanitized-version-147-restored";
  writeEvidence(nextState);
  return nextState;
}

function ensureBuildArtifacts() {
  [DEFAULT_ZIP, API_ZIP, ASSETS_DIR].forEach(entry => {
    if (!fs.existsSync(entry))
      throw new Error(`Production build artifact is missing: ${entry}`);
  });
  const metadata = JSON.parse(
    fs.readFileSync(path.join(RELEASE_DIR, "build-metadata.json"), "utf8")
  );
  if (
    metadata.release_sha !== process.env.DEPLOY_SHA ||
    metadata.default_zip_code_sha256 !== zipCodeSha256(DEFAULT_ZIP) ||
    metadata.api_zip_code_sha256 !== zipCodeSha256(API_ZIP)
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

function deploy() {
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
    assertVersionArn(expectedApiArn, API_FUNCTION_ARN);
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
  assertFunctionContract(
    functionConfiguration(API_FUNCTION_NAME),
    API_FUNCTION_ARN,
    1024
  );
  verifySanitizedRollbackVersion();

  const baselineConfigPath = path.join(RELEASE_DIR, "cloudfront-before.json");
  fs.writeFileSync(baselineConfigPath, JSON.stringify(baseline, null, 2));
  // Empty stdout = never-configured (not an error); Status absent → enable below.
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
    path.join(RELEASE_DIR, "homepage-before.html")
  );
  let state = {
    target: "https://hecmedia.org",
    outcome: "in_progress",
    release_sha: process.env.DEPLOY_SHA,
    request_task_id: process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID,
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
    build: metadata,
    rollback_outcome: "not-needed",
    generated_at: new Date().toISOString()
  };
  writeEvidence(state);

  let cloudFrontMutationAttempted = false;
  try {
    if (bucketVersioning.Status !== "Enabled") {
      run("aws", [
        "s3api",
        "put-bucket-versioning",
        "--bucket",
        BUCKET_NAME,
        "--versioning-configuration",
        "Status=Enabled"
      ]);
    }
    const enabled = runJson(
      "aws",
      ["s3api", "get-bucket-versioning", "--bucket", BUCKET_NAME],
      { allowEmptyObject: true }
    );
    if (enabled.Status !== "Enabled") {
      throw new Error("Production S3 versioning did not become enabled.");
    }

    syncAssets();
    const shortSha = process.env.DEPLOY_SHA.slice(0, 12);
    const defaultPublished = publishLambda(
      DEFAULT_FUNCTION_NAME,
      DEFAULT_ZIP,
      `HEC production ${shortSha} task ${process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID}`
    );
    const apiPublished = publishLambda(
      API_FUNCTION_NAME,
      API_ZIP,
      `HEC newsletter ${shortSha} task ${process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID}`
    );
    state.new_default_lambda = defaultPublished;
    state.new_api_lambda = apiPublished;
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
    const productionConfig = configureProductionDistribution(
      beforeCutover.DistributionConfig,
      expectedDefaultArn,
      expectedApiArn,
      defaultPublished.arn,
      apiPublished.arn
    );
    cloudFrontMutationAttempted = true;
    updateDistribution(
      productionConfig,
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
    verifyHydratedRoutes(process.env.BROWSER_BIN);

    const live = getDistributionConfig();
    assertDistributionContractWithRelease(
      live.DistributionConfig,
      defaultPublished.arn,
      apiPublished.arn
    );
    state.live_cloudfront_etag = live.ETag;
    state.outcome = "success";
    state.completed_at = new Date().toISOString();
    writeEvidence(state);
    console.log(
      `HEC frontend production release verified: ${defaultPublished.arn} + ${apiPublished.arn}`
    );
  } catch (error) {
    state.outcome = "failed";
    state.error = error.message || String(error);
    if (cloudFrontMutationAttempted) {
      try {
        state = applySanitizedRollback(state);
      } catch (rollbackError) {
        state.rollback_outcome = "rollback-failed";
        state.rollback_error = rollbackError.message || String(rollbackError);
      }
    } else {
      state.rollback_outcome = "public-cutover-not-started";
    }
    state.completed_at = new Date().toISOString();
    writeEvidence(state);
    throw error;
  }
}

function rollback() {
  assertGovernedDeployContext(process.env, "rollback");
  verifySanitizedRollbackVersion();
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  let state = {};
  if (fs.existsSync(EVIDENCE_PATH)) {
    state = JSON.parse(fs.readFileSync(EVIDENCE_PATH, "utf8"));
  }
  state.outcome = "manual_rollback";
  state.release_sha = process.env.DEPLOY_SHA;
  state.request_task_id = process.env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID;
  state = applySanitizedRollback(state);
  return state;
}

async function main() {
  const command = process.argv[2];
  if (command === "build") return build();
  if (command === "deploy") return deploy();
  if (command === "rollback") return rollback();
  throw new Error(
    `Unknown command "${command}". Use build, deploy, or rollback.`
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
  apiBehavior,
  assertDistributionContract,
  assertFunctionContract,
  assertGovernedDeployContext,
  configureProductionDistribution,
  configureSanitizedRollback,
  parseJsonOutput,
  requireBuildContract
};
