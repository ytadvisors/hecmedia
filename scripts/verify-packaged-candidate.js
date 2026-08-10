#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { requireBuildContract } = require("./production-deploy");
const { assertPage } = require("./verify-production");

const REPO_ROOT = path.join(__dirname, "..");
const DEFAULT_LAMBDA_DIR = path.join(
  REPO_ROOT,
  ".serverless_nextjs/default-lambda"
);
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, ".production-release");
const PACKAGED_ROUTES = [
  "/",
  "/category/films",
  "/posts/hec-on-youtube",
  "/newsletter"
];

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function createCloudFrontRequestEvent(route, cacheBust) {
  const requestUrl = new URL(route, "https://hecmedia.org");
  requestUrl.searchParams.set("hecmedia_packaged_verify", cacheBust);
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: "local-packaged-candidate.invalid",
            distributionId: "LOCAL",
            eventType: "origin-request",
            requestId: `local-${cacheBust}`
          },
          request: {
            clientIp: "127.0.0.1",
            headers: {
              accept: [{ key: "Accept", value: "text/html" }],
              host: [{ key: "Host", value: "hecmedia.org" }],
              "user-agent": [
                {
                  key: "User-Agent",
                  value: "HECMedia-Packaged-Candidate-Audit/2026-08-10"
                }
              ],
              "x-forwarded-proto": [
                { key: "X-Forwarded-Proto", value: "https" }
              ]
            },
            method: "GET",
            origin: {
              s3: {
                authMethod: "origin-access-identity",
                customHeaders: {},
                domainName: "x2l4ew-k0m7umi.s3.us-east-1.amazonaws.com",
                path: "",
                region: "us-east-1"
              }
            },
            querystring: requestUrl.searchParams.toString(),
            uri: requestUrl.pathname
          }
        }
      }
    ]
  };
}

function decodeLambdaResponse(response, route) {
  const statusCode = Number(response && response.status);
  if (!Number.isInteger(statusCode) || !Object.hasOwn(response || {}, "body")) {
    throw new Error(
      `Packaged Lambda route ${route} did not return an SSR response.`
    );
  }
  if (response.bodyEncoding && response.bodyEncoding !== "base64") {
    throw new Error(
      `Packaged Lambda route ${route} used unsupported body encoding ${response.bodyEncoding}.`
    );
  }
  const body =
    response.bodyEncoding === "base64"
      ? Buffer.from(response.body || "", "base64").toString("utf8")
      : String(response.body || "");
  return { body, statusCode };
}

function routeSlug(route, index) {
  return index === 0 ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
}

async function verifyPackagedCandidate(options = {}) {
  const {
    env = process.env,
    handler: providedHandler,
    outputDir = DEFAULT_OUTPUT_DIR,
    routes = PACKAGED_ROUTES
  } = options;
  requireBuildContract(env);
  fs.mkdirSync(outputDir, { recursive: true });
  let handler = providedHandler;
  if (!handler) {
    const handlerPath = path.join(DEFAULT_LAMBDA_DIR, "index.js");
    if (!fs.existsSync(handlerPath)) {
      throw new Error(`Packaged Lambda handler is missing: ${handlerPath}`);
    }
    // The exact build artifact is intentionally loaded only after the build
    // contract passes.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    handler = require(handlerPath).handler;
  }
  if (typeof handler !== "function") {
    throw new Error("Packaged Lambda artifact did not export handler().");
  }
  const contract = {
    expectedFormsMode: "false",
    expectedGtmId: "GTM-57RZPNN",
    expectedNewsletterMode: "omit",
    expectedSha: env.DEPLOY_SHA
  };
  const records = [];
  await routes.reduce(
    (previous, route, index) =>
      previous.then(async () => {
        const cacheBust = `${Date.now()}-${index}`;
        const response = await handler(
          createCloudFrontRequestEvent(route, cacheBust)
        );
        const decoded = decodeLambdaResponse(response, route);
        assertPage(
          { route, statusCode: decoded.statusCode, body: decoded.body },
          contract
        );
        const slug = routeSlug(route, index);
        const htmlPath = path.join(
          outputDir,
          `packaged-candidate-${slug}.html`
        );
        fs.writeFileSync(htmlPath, decoded.body);
        records.push({
          bodyBytes: Buffer.byteLength(decoded.body),
          bodySha256: sha256(decoded.body),
          cacheBust,
          route,
          statusCode: decoded.statusCode
        });
      }),
    Promise.resolve()
  );
  const summary = {
    checkedAt: new Date().toISOString(),
    interactionDeclaration:
      "GET-only packaged SSR smoke; production CMS reads only; no form, analytics, conversion, or AWS mutation.",
    releaseSha: env.DEPLOY_SHA,
    routes: records
  };
  fs.writeFileSync(
    path.join(outputDir, "packaged-candidate-smoke.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );
  return summary;
}

if (require.main === module) {
  verifyPackagedCandidate()
    .then(summary => console.log(JSON.stringify(summary)))
    .catch(error => {
      console.error(error && error.stack ? error.stack : error);
      process.exitCode = 1;
    });
}

module.exports = {
  PACKAGED_ROUTES,
  createCloudFrontRequestEvent,
  decodeLambdaResponse,
  verifyPackagedCandidate
};
