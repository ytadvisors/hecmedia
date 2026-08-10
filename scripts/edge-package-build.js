#!/usr/bin/env node

/*
 * Build-only Lambda@Edge package helper shared by the governed production
 * controller. This module makes no AWS calls and contains no deployment
 * entrypoint. Production mutation remains exclusively in production-deploy.js.
 */

const path = require("path");
const fs = require("fs");

const REPO_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(REPO_ROOT, ".serverless_nextjs");
const ASSETS_DIR = path.join(BUILD_DIR, "assets");
const DEFAULT_LAMBDA_DIR = path.join(BUILD_DIR, "default-lambda");
const API_LAMBDA_DIR = path.join(BUILD_DIR, "api-lambda");
const IMAGE_LAMBDA_DIR = path.join(BUILD_DIR, "image-lambda");
const API_PAGES_DIR = path.join(REPO_ROOT, "pages", "api");
const OMITTED_API_PAGES_DIR = path.join(
  REPO_ROOT,
  ".edge-build-omitted-pages-api"
);
const NEXT_WEBPACK_RUNTIME_PATH = path.join(
  REPO_ROOT,
  ".next",
  "serverless",
  "webpack-runtime.js"
);
const LAMBDA_WEBPACK_RUNTIME_PATH = path.join(
  DEFAULT_LAMBDA_DIR,
  "webpack-runtime.js"
);
const NEXT_SERVER_CHUNKS_PATH = path.join(
  REPO_ROOT,
  ".next",
  "serverless",
  "chunks"
);
const LAMBDA_CHUNKS_PATH = path.join(DEFAULT_LAMBDA_DIR, "chunks");

function directoryHasFiles(directory) {
  if (!fs.existsSync(directory)) return false;
  return fs.readdirSync(directory, { withFileTypes: true }).some(entry => {
    const entryPath = path.join(directory, entry.name);
    return (
      entry.isFile() || (entry.isDirectory() && directoryHasFiles(entryPath))
    );
  });
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  fs.readdirSync(source, { withFileTypes: true }).forEach(entry => {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    } else {
      throw new Error(
        `Refusing to package unsupported runtime entry ${sourcePath}.`
      );
    }
  });
}

function stageNextServerRuntime() {
  if (!fs.existsSync(LAMBDA_WEBPACK_RUNTIME_PATH)) {
    if (!fs.existsSync(NEXT_WEBPACK_RUNTIME_PATH)) {
      throw new Error(
        "Next 12 generated no serverless webpack-runtime.js; refusing to publish an unloadable Lambda bundle."
      );
    }
    fs.copyFileSync(NEXT_WEBPACK_RUNTIME_PATH, LAMBDA_WEBPACK_RUNTIME_PATH);
  }
  if (!fs.existsSync(LAMBDA_CHUNKS_PATH)) {
    if (!fs.existsSync(NEXT_SERVER_CHUNKS_PATH)) {
      throw new Error(
        "Next 12 generated no serverless chunks; refusing to publish an unloadable Lambda bundle."
      );
    }
    copyDirectory(NEXT_SERVER_CHUNKS_PATH, LAMBDA_CHUNKS_PATH);
  }
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
        "The edge package contract deliberately uses the reviewed API handler instead."
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

function sourceUsesNextImage(directory = REPO_ROOT) {
  const ignored = new Set([
    ".git",
    ".next",
    ".serverless_nextjs",
    "coverage",
    "node_modules"
  ]);
  const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);

  function scan(current) {
    return fs.readdirSync(current, { withFileTypes: true }).some(entry => {
      if (ignored.has(entry.name)) return false;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) return scan(entryPath);
      if (/\.(?:test|spec)\.[^.]+$/.test(entry.name)) return false;
      if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) {
        return false;
      }
      const source = fs.readFileSync(entryPath, "utf8");
      return /(?:from\s*|require\(\s*|import\(\s*)["']next\/image["']/.test(
        source
      );
    });
  }

  return scan(directory);
}

function discardUnusedImageLambdaBundle() {
  if (!fs.existsSync(IMAGE_LAMBDA_DIR)) return;
  if (process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER !== "true") {
    throw new Error(
      "Generated image-lambda while HECMEDIA_DISABLE_IMAGE_OPTIMIZER is not true. " +
        "Refusing to discard it."
    );
  }
  if (sourceUsesNextImage()) {
    throw new Error(
      "Generated image-lambda and application source imports next/image. " +
        "Refusing to discard a bundle the application may need."
    );
  }

  fs.rmSync(IMAGE_LAMBDA_DIR, { recursive: true, force: false });
  console.log(
    "Discarded generated image-lambda after verifying the optimizer flag and zero next/image imports."
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

  // A no-send diagnostic build may omit stock API routes. The governed
  // production build may also omit them when HECMEDIA_EDGE_API=true because
  // the reviewed Lambda@Edge handler owns that exact API path. Always restore
  // the source tree, including after a failed build. Other send-enabled builds
  // retain the API routes and fail closed if they try to omit them.
  let apiPagesMoved = false;
  if (fs.existsSync(API_PAGES_DIR)) {
    const noSendBuild = process.env.HECMEDIA_NO_SEND_FORMS === "true";
    const governedEdgeApi = process.env.HECMEDIA_EDGE_API === "true";
    if (!noSendBuild && !governedEdgeApi) {
      throw new Error(
        "Refusing to omit Next API routes unless HECMEDIA_NO_SEND_FORMS=true or HECMEDIA_EDGE_API=true."
      );
    }
    if (fs.existsSync(OMITTED_API_PAGES_DIR)) {
      throw new Error(
        `${OMITTED_API_PAGES_DIR} already exists; refusing to overwrite it.`
      );
    }
    fs.renameSync(API_PAGES_DIR, OMITTED_API_PAGES_DIR);
    apiPagesMoved = true;
  }

  try {
    await builder.build();
  } finally {
    if (apiPagesMoved) {
      fs.renameSync(OMITTED_API_PAGES_DIR, API_PAGES_DIR);
    }
  }

  if (!fs.existsSync(DEFAULT_LAMBDA_DIR) || !fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Expected ${DEFAULT_LAMBDA_DIR} and ${ASSETS_DIR} after build - the ` +
        "sls-next output layout may have changed; do not guess at new paths."
    );
  }

  stageNextServerRuntime();
  discardEmptyApiLambdaBundle();
  discardUnusedImageLambdaBundle();

  // The governed production controller publishes the reviewed default and API
  // edge handlers. Unexpected stock API/image bundles must never silently add
  // another deployment surface.
  ["api-lambda", "image-lambda"].forEach(extra => {
    if (fs.existsSync(path.join(BUILD_DIR, extra))) {
      throw new Error(
        `Build produced unexpected .serverless_nextjs/${extra}. ` +
          "The governed edge package contract must be deliberately reviewed before adding another deployment surface."
      );
    }
  });
}

module.exports = {
  build,
  discardEmptyApiLambdaBundle,
  discardUnusedImageLambdaBundle,
  stageNextServerRuntime,
  sourceUsesNextImage
};
