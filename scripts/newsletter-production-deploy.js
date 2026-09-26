#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REGION = "us-east-1";
const DISTRIBUTION_ID = "E2QXRSF2W55RTS";
const BUCKET_NAME = "x2l4ew-k0m7umi";
const ORIGIN_ID = "x2l4ew-k0m7umi";
const FUNCTION_NAME = "hecmedia-newsletter-api-edge";
const EXECUTION_ROLE = "arn:aws:iam::850335719356:role/x2l4ew-0kb1zus";
const REPO_ROOT = path.join(__dirname, "..");
const EXPORT_DIR = path.join(REPO_ROOT, ".newsletter-export");
const RELEASE_DIR = path.join(REPO_ROOT, ".newsletter-production");
const EDGE_SOURCE = path.join(
  REPO_ROOT,
  "scripts",
  "edge-handlers",
  "newsletter-api-edge.js"
);

const MANAGED_PATTERNS = [
  "api/newsletter/subscribe",
  "newsletter",
  "newsletter/*"
];

function run(command, args, options = {}) {
  console.log(`+ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : "pipe",
    ...options
  });
}

function requireProductionSiteKey() {
  const siteKey = process.env.RE_CAPTCHA_SITE_KEY || "";
  if (!/^6L[A-Za-z0-9_-]{30,}$/.test(siteKey)) {
    throw new Error(
      "RE_CAPTCHA_SITE_KEY must be the production public site key."
    );
  }
  return siteKey;
}

function assertSafeExport() {
  const required = [
    path.join(EXPORT_DIR, "newsletter.html"),
    path.join(EXPORT_DIR, "newsletter", "thank-you.html"),
    path.join(EXPORT_DIR, "_next", "static")
  ];
  required.forEach(entry => {
    if (!fs.existsSync(entry)) {
      throw new Error(`Scoped newsletter export is missing ${entry}.`);
    }
  });

  const forbidden = [
    "AWS_SECRET_ACCESS_KEY",
    "HECTV_RECAPTCHA_SECRET_KEY",
    "RE_CAPTCHA_SECRET_KEY"
  ];
  const queue = [EXPORT_DIR];
  while (queue.length) {
    const entry = queue.pop();
    fs.readdirSync(entry, { withFileTypes: true }).forEach(child => {
      const childPath = path.join(entry, child.name);
      if (child.isDirectory()) queue.push(childPath);
      else if (child.isFile()) {
        const contents = fs.readFileSync(childPath);
        forbidden.forEach(marker => {
          if (contents.includes(Buffer.from(marker))) {
            throw new Error(
              `Export contains forbidden server credential marker ${marker} in ${childPath}.`
            );
          }
        });
      }
    });
  }
}

function build() {
  requireProductionSiteKey();
  fs.rmSync(EXPORT_DIR, { recursive: true, force: true });
  const env = {
    ...process.env,
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    WP_HOST: "https://prod-wp.hectv.org",
    SITE_HOST: "https://hecmedia.org",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_NEWSLETTER_EXPORT: "true",
    HECMEDIA_MODERN_WPGRAPHQL: "false",
    HECMEDIA_NO_SEND_FORMS: "false"
  };
  run("node_modules/.bin/next", ["build"], { env, capture: false });
  run("node_modules/.bin/next", ["export", "-o", EXPORT_DIR], {
    env,
    capture: false
  });
  assertSafeExport();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function staticBehavior(defaultBehavior, pattern) {
  const behavior = clone(defaultBehavior);
  behavior.PathPattern = pattern;
  behavior.TargetOriginId = ORIGIN_ID;
  behavior.AllowedMethods = {
    Quantity: 2,
    Items: ["HEAD", "GET"],
    CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
  };
  behavior.LambdaFunctionAssociations = { Quantity: 0 };
  behavior.MinTTL = 0;
  behavior.DefaultTTL = 60;
  behavior.MaxTTL = 300;
  behavior.Compress = true;
  behavior.ForwardedValues = {
    QueryString: false,
    Cookies: { Forward: "none" },
    Headers: { Quantity: 0 },
    QueryStringCacheKeys: { Quantity: 0 }
  };
  return behavior;
}

function apiBehavior(defaultBehavior, lambdaVersionArn) {
  const behavior = staticBehavior(defaultBehavior, "api/newsletter/subscribe");
  behavior.AllowedMethods = {
    Quantity: 7,
    Items: ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"],
    CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
  };
  behavior.DefaultTTL = 0;
  behavior.MaxTTL = 0;
  behavior.LambdaFunctionAssociations = {
    Quantity: 1,
    Items: [
      {
        LambdaFunctionARN: lambdaVersionArn,
        EventType: "origin-request",
        IncludeBody: true
      }
    ]
  };
  return behavior;
}

function configureDistribution(config, lambdaVersionArn) {
  if (
    !config ||
    !config.DefaultCacheBehavior ||
    config.DefaultCacheBehavior.TargetOriginId !== ORIGIN_ID
  ) {
    throw new Error(
      "Production CloudFront origin contract changed; refusing update."
    );
  }
  if (!/:\d+$/.test(lambdaVersionArn)) {
    throw new Error(
      "Lambda@Edge requires a published, versioned function ARN."
    );
  }

  const nextConfig = clone(config);
  const existing =
    (nextConfig.CacheBehaviors && nextConfig.CacheBehaviors.Items) || [];
  const unmanaged = existing.filter(
    behavior => !MANAGED_PATTERNS.includes(behavior.PathPattern)
  );
  const managed = [
    apiBehavior(nextConfig.DefaultCacheBehavior, lambdaVersionArn),
    staticBehavior(nextConfig.DefaultCacheBehavior, "newsletter"),
    staticBehavior(nextConfig.DefaultCacheBehavior, "newsletter/*")
  ];
  nextConfig.CacheBehaviors = {
    Quantity: unmanaged.length + managed.length,
    Items: [...managed, ...unmanaged]
  };
  return nextConfig;
}

function assertMerged() {
  run("git", ["fetch", "origin", "master"], { capture: false });
  run("git", ["merge-base", "--is-ancestor", "HEAD", "origin/master"]);
}

function syncAssets() {
  run(
    "aws",
    [
      "s3",
      "sync",
      path.join(EXPORT_DIR, "_next", "static"),
      `s3://${BUCKET_NAME}/_next/static`,
      "--region",
      REGION,
      "--cache-control",
      "public,max-age=31536000,immutable"
    ],
    { capture: false }
  );
  const publicStatic = path.join(EXPORT_DIR, "static");
  if (fs.existsSync(publicStatic)) {
    run(
      "aws",
      [
        "s3",
        "sync",
        publicStatic,
        `s3://${BUCKET_NAME}/static`,
        "--region",
        REGION
      ],
      { capture: false }
    );
  }
  [
    ["newsletter.html", "newsletter"],
    ["newsletter/thank-you.html", "newsletter/thank-you"]
  ].forEach(([source, key]) => {
    run(
      "aws",
      [
        "s3",
        "cp",
        path.join(EXPORT_DIR, source),
        `s3://${BUCKET_NAME}/${key}`,
        "--region",
        REGION,
        "--content-type",
        "text/html; charset=utf-8",
        "--cache-control",
        "public,max-age=60"
      ],
      { capture: false }
    );
  });
}

function zipEdgeHandler() {
  const edgeDir = path.join(RELEASE_DIR, "edge");
  const zipPath = path.join(RELEASE_DIR, "newsletter-api-edge.zip");
  fs.rmSync(edgeDir, { recursive: true, force: true });
  fs.mkdirSync(edgeDir, { recursive: true });
  fs.copyFileSync(EDGE_SOURCE, path.join(edgeDir, "index.js"));
  fs.rmSync(zipPath, { force: true });
  run("zip", ["-X", "-q", zipPath, "index.js"], { cwd: edgeDir });
  return zipPath;
}

function publishedFunctionArn(version) {
  const arn = version && version.FunctionArn;
  const publishedVersion = version && version.Version;
  const expectedArn = new RegExp(
    `^arn:aws:lambda:${REGION}:\\d{12}:function:${FUNCTION_NAME}:${publishedVersion}$`
  );

  if (!/^\d+$/.test(publishedVersion || "") || !expectedArn.test(arn || "")) {
    throw new Error(
      "AWS publish-version returned an invalid Lambda@Edge function ARN."
    );
  }

  return arn;
}

function publishEdgeFunction() {
  const zipPath = zipEdgeHandler();
  let exists = true;
  try {
    run("aws", [
      "lambda",
      "get-function",
      "--region",
      REGION,
      "--function-name",
      FUNCTION_NAME
    ]);
  } catch (error) {
    exists = false;
  }

  if (exists) {
    run("aws", [
      "lambda",
      "update-function-code",
      "--region",
      REGION,
      "--function-name",
      FUNCTION_NAME,
      "--zip-file",
      `fileb://${zipPath}`
    ]);
  } else {
    run("aws", [
      "lambda",
      "create-function",
      "--region",
      REGION,
      "--function-name",
      FUNCTION_NAME,
      "--runtime",
      "nodejs24.x",
      "--role",
      EXECUTION_ROLE,
      "--handler",
      "index.handler",
      "--timeout",
      "10",
      "--memory-size",
      "128",
      "--zip-file",
      `fileb://${zipPath}`
    ]);
  }
  run("aws", [
    "lambda",
    "wait",
    "function-updated",
    "--region",
    REGION,
    "--function-name",
    FUNCTION_NAME
  ]);
  const version = JSON.parse(
    run("aws", [
      "lambda",
      "publish-version",
      "--region",
      REGION,
      "--function-name",
      FUNCTION_NAME,
      "--description",
      `HEC newsletter ${run("git", ["rev-parse", "--short", "HEAD"]).trim()}`
    ])
  );
  return publishedFunctionArn(version);
}

function updateDistribution(lambdaVersionArn) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const current = JSON.parse(
    run("aws", [
      "cloudfront",
      "get-distribution-config",
      "--id",
      DISTRIBUTION_ID
    ])
  );
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    RELEASE_DIR,
    `cloudfront-before-${timestamp}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(current, null, 2));

  const config = configureDistribution(
    current.DistributionConfig,
    lambdaVersionArn
  );
  const configPath = path.join(RELEASE_DIR, "cloudfront-newsletter.json");
  fs.writeFileSync(configPath, JSON.stringify(config));
  run("aws", [
    "cloudfront",
    "update-distribution",
    "--id",
    DISTRIBUTION_ID,
    "--if-match",
    current.ETag,
    "--distribution-config",
    `file://${configPath}`
  ]);
  run(
    "aws",
    ["cloudfront", "wait", "distribution-deployed", "--id", DISTRIBUTION_ID],
    { capture: false }
  );
  const invalidationId = run("aws", [
    "cloudfront",
    "create-invalidation",
    "--distribution-id",
    DISTRIBUTION_ID,
    "--paths",
    "/newsletter",
    "/newsletter/thank-you",
    "/api/newsletter/subscribe",
    "--query",
    "Invalidation.Id",
    "--output",
    "text"
  ]).trim();
  run(
    "aws",
    [
      "cloudfront",
      "wait",
      "invalidation-completed",
      "--distribution-id",
      DISTRIBUTION_ID,
      "--id",
      invalidationId
    ],
    { capture: false }
  );
  return backupPath;
}

function verify() {
  ["/newsletter", "/newsletter/thank-you"].forEach(route => {
    run(
      "curl",
      [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--retry",
        "12",
        "--retry-all-errors",
        "--retry-delay",
        "5",
        `https://hecmedia.org${route}`,
        "--output",
        "/dev/null"
      ],
      { capture: false }
    );
  });
  const status = run("curl", [
    "--silent",
    "--show-error",
    "--request",
    "POST",
    "--header",
    "Content-Type: application/json",
    "--data",
    "{}",
    "--output",
    "/dev/null",
    "--write-out",
    "%{http_code}",
    "https://hecmedia.org/api/newsletter/subscribe"
  ]).trim();
  if (status !== "400") {
    throw new Error(
      `Newsletter API verification returned ${status}, expected 400.`
    );
  }
}

function deploy() {
  requireProductionSiteKey();
  assertMerged();
  assertSafeExport();
  syncAssets();
  const lambdaVersionArn = publishEdgeFunction();
  const backupPath = updateDistribution(lambdaVersionArn);
  verify();
  console.log(`Newsletter release verified. Rollback config: ${backupPath}`);
}

function main() {
  const command = process.argv[2];
  if (command === "build") return build();
  if (command === "deploy") return deploy();
  if (command === "verify") return verify();
  throw new Error(
    `Unknown command "${command}". Use build, deploy, or verify.`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  apiBehavior,
  assertSafeExport,
  configureDistribution,
  publishedFunctionArn,
  staticBehavior
};
