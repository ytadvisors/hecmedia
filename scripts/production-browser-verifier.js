const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const {
  INVENTORY_SCHEMA,
  analyzeSource,
  assertExpectedResource
} = require("./verify-gtm-resource");

const EXACT_GTM_ID = "GTM-57RZPNN";
const FIRST_PARTY_HOSTS = new Set(["hecmedia.org", "www.hecmedia.org"]);
const MEDIA_PATH_PREFIXES = new Map([
  ["asset.ytadvisors.com", ["/client-documents/hecmedia/media-library/"]],
  ["prd-hectv-wp-media.s3.us-east-2.amazonaws.com", ["/wp-content/uploads/"]],
  ["prod-wp.hectv.org", ["/wp-content/uploads/"]],
  ["prod-wp-ecs.hectv.org", ["/wp-content/uploads/"]]
]);
const MEDIA_HOSTS = new Set(MEDIA_PATH_PREFIXES.keys());
const SAFE_FIRST_PARTY_PREFIXES = ["/_next/", "/static/"];
const SAFE_FIRST_PARTY_FILES = /\.(?:avif|css|gif|ico|jpe?g|js|map|png|svg|webp|woff2?)$/i;
const FORBIDDEN_FIRST_PARTY_PREFIXES = [
  "/api/",
  "/graphql",
  "/wp-admin",
  "/wp-json",
  "/admin"
];

function playwrightChromium() {
  // The production workflow installs the repository's frozen dev dependencies
  // before invoking this verification-only script.
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  return require("@playwright/test").chromium;
}

function isNetworkSafeUrl(candidate) {
  return (
    candidate.protocol === "https:" &&
    !candidate.username &&
    !candidate.password &&
    (!candidate.port || candidate.port === "443") &&
    !candidate.hash
  );
}

function isExactGtmLoader(value, gtmId = EXACT_GTM_ID) {
  try {
    const candidate = new URL(value);
    return (
      isNetworkSafeUrl(candidate) &&
      candidate.hostname === "www.googletagmanager.com" &&
      candidate.pathname === "/gtm.js" &&
      candidate.searchParams.get("id") === gtmId &&
      Array.from(candidate.searchParams.keys()).join(",") === "id"
    );
  } catch (error) {
    return false;
  }
}

function isSafeMethod(method) {
  return ["GET", "HEAD"].includes(String(method || "GET").toUpperCase());
}

function isSafeFirstPartyRequest(candidate, options) {
  const { resourceType = "other", routePath = "/" } = options;
  if (
    FORBIDDEN_FIRST_PARTY_PREFIXES.some(prefix =>
      candidate.pathname.startsWith(prefix)
    )
  ) {
    return false;
  }
  if (resourceType === "document") {
    const queryKeys = Array.from(candidate.searchParams.keys());
    return (
      candidate.pathname === routePath &&
      queryKeys.length === 1 &&
      queryKeys[0] === "hecmedia_verify"
    );
  }
  return (
    SAFE_FIRST_PARTY_PREFIXES.some(prefix =>
      candidate.pathname.startsWith(prefix)
    ) ||
    SAFE_FIRST_PARTY_FILES.test(candidate.pathname) ||
    ["/favicon.ico", "/robots.txt", "/site.webmanifest"].includes(
      candidate.pathname
    )
  );
}

function isSafeMediaRequest(candidate) {
  return (MEDIA_PATH_PREFIXES.get(candidate.hostname) || []).some(prefix =>
    candidate.pathname.startsWith(prefix)
  );
}

function classifyBrowserRequest(value, gtmId = EXACT_GTM_ID, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  let candidate;
  try {
    candidate = new URL(value);
  } catch (error) {
    return { allow: false, category: "invalid-url" };
  }
  if (["about:", "blob:", "data:"].includes(candidate.protocol)) {
    return { allow: true, category: "local-browser" };
  }
  if (!isSafeMethod(method)) {
    return { allow: false, category: "write-method" };
  }
  if (!isNetworkSafeUrl(candidate)) {
    return { allow: false, category: "unsafe-network-url" };
  }
  if (isExactGtmLoader(value, gtmId)) {
    return { allow: true, category: "exact-gtm-loader" };
  }
  if (FIRST_PARTY_HOSTS.has(candidate.hostname)) {
    return isSafeFirstPartyRequest(candidate, options)
      ? { allow: true, category: "first-party-read" }
      : { allow: false, category: "first-party-path-refused" };
  }
  if (MEDIA_HOSTS.has(candidate.hostname)) {
    return isSafeMediaRequest(candidate)
      ? { allow: true, category: "approved-media-read" }
      : { allow: false, category: "media-path-refused" };
  }
  return { allow: false, category: "non-allowlisted-third-party" };
}

function assertBrowserGtmEvidence(evidence, gtmId = EXACT_GTM_ID) {
  if (!evidence || evidence.statusCode !== 200) {
    throw new Error(
      `Hydrated production route ${evidence &&
        evidence.route} did not return HTTP 200.`
    );
  }
  if (
    evidence.gtmLoaderRequests.length !== 1 ||
    !isExactGtmLoader(evidence.gtmLoaderRequests[0].url, gtmId) ||
    evidence.gtmLoaderRequests[0].status < 200 ||
    evidence.gtmLoaderRequests[0].status >= 300 ||
    evidence.gtmSemanticCaptures.length !== 1 ||
    evidence.gtmSemanticErrors.length !== 0
  ) {
    throw new Error(
      `Hydrated production route ${evidence.route} did not load one semantically approved GTM loader.`
    );
  }
  if (
    !evidence.dataLayer.exists ||
    evidence.dataLayer.bootstrapCount !== 1 ||
    evidence.dataLayer.gtmEventCount !== 1
  ) {
    throw new Error(
      `Hydrated production route ${evidence.route} did not bootstrap dataLayer exactly once.`
    );
  }
  if (evidence.successfulNonAllowlistedRequests.length !== 0) {
    throw new Error(
      `Hydrated production route ${evidence.route} completed a non-allowlisted request.`
    );
  }
  const dangerousConsole = evidence.consoleErrors.filter(message =>
    /content security policy|refused to|uncaught|typeerror|googletagmanager.*(?:error|fail)/i.test(
      message.text
    )
  );
  if (evidence.pageErrors.length > 0 || dangerousConsole.length > 0) {
    throw new Error(
      `Hydrated production route ${evidence.route} emitted a GTM/CSP/JavaScript error.`
    );
  }
}

function routeSlug(route, index) {
  return index === 0 ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

async function selfTestBrowser(browserPath) {
  if (!browserPath || !fs.existsSync(browserPath)) {
    throw new Error(
      "BROWSER_BIN must name an installed Chrome or Chromium binary."
    );
  }
  const serverHits = { http: 0, websocket: 0 };
  const server = http.createServer((request, response) => {
    serverHits.http += 1;
    response.writeHead(204);
    response.end();
  });
  server.on("upgrade", (request, socket) => {
    serverHits.websocket += 1;
    socket.destroy();
  });
  const address = await listen(server);
  const chromium = playwrightChromium();
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"]
  });
  const intercepted = { http: 0, websocket: 0 };
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", route => {
      if (String(route.request().url()).startsWith("data:")) {
        return route.continue();
      }
      intercepted.http += 1;
      return route.abort("blockedbyclient");
    });
    await context.routeWebSocket(/.*/, socket => {
      intercepted.websocket += 1;
      return socket.close({ code: 1000, reason: "HEC verifier self-test" });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.goto("data:text/html,<title>HEC verifier self-test</title>");
    await page.evaluate(
      async urls => {
        await fetch(urls.http).catch(() => null);
        await new Promise(resolve => {
          const socket = new window.WebSocket(urls.websocket);
          socket.addEventListener("open", () => socket.close());
          socket.addEventListener("close", resolve, { once: true });
          socket.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 1000);
        });
      },
      {
        http: `http://127.0.0.1:${address.port}/forbidden-http`,
        websocket: `ws://127.0.0.1:${address.port}/forbidden-websocket`
      }
    );
    const title = await page.title();
    await context.close();
    if (
      title !== "HEC verifier self-test" ||
      intercepted.http < 1 ||
      intercepted.websocket < 1 ||
      serverHits.http !== 0 ||
      serverHits.websocket !== 0
    ) {
      throw new Error(
        `Browser firewall self-test failed: ${JSON.stringify({
          intercepted,
          serverHits,
          title
        })}`
      );
    }
    return {
      browserVersion: browser.version(),
      intercepted,
      serverHits,
      title
    };
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

function serializableEvidence(records) {
  return records.map(({ dom, ...record }) => record);
}

function writeAggregateEvidence(options, records) {
  fs.writeFileSync(
    path.join(options.outputDir, "hydrated-network.json"),
    `${JSON.stringify(
      {
        allowlist: {
          exactGtmLoader: `https://www.googletagmanager.com/gtm.js?id=${options.gtmId}`,
          firstPartyHosts: Array.from(FIRST_PARTY_HOSTS),
          mediaHosts: Array.from(MEDIA_HOSTS),
          methods: ["GET", "HEAD"]
        },
        browserPath: options.browserPath,
        browserVersion: options.browserVersion,
        checkedAt: new Date().toISOString(),
        routes: serializableEvidence(records)
      },
      null,
      2
    )}\n`
  );
}

function writeRouteEvidence(outputDir, slug, routeEvidence) {
  fs.writeFileSync(
    path.join(outputDir, `hydrated-${slug}.html`),
    routeEvidence.dom || ""
  );
  fs.writeFileSync(
    path.join(outputDir, `browser-${slug}.log`),
    `${JSON.stringify(
      {
        allowedRequests: routeEvidence.allowedRequests,
        blockedRequests: routeEvidence.blockedRequests,
        blockedWebSockets: routeEvidence.blockedWebSockets,
        consoleErrors: routeEvidence.consoleErrors,
        failure: routeEvidence.failure || null,
        gtmSemanticCaptures: routeEvidence.gtmSemanticCaptures,
        gtmSemanticErrors: routeEvidence.gtmSemanticErrors,
        pageErrors: routeEvidence.pageErrors
      },
      null,
      2
    )}\n`
  );
}

function semanticEvidence(analysis, rawBody, headers = {}) {
  return {
    canonicalBytes: analysis.canonicalBytes,
    canonicalSha256: analysis.canonicalSha256,
    counts: analysis.counts,
    inventorySchema: analysis.inventorySchema,
    inventorySha256: analysis.inventorySha256,
    rawBytes: rawBody.length,
    rawSha256: crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex"),
    rawSha256Role: "secondary_non_gate",
    resourceVersion: analysis.resourceVersion,
    responseHeaders: {
      cacheControl: headers["cache-control"] || null,
      contentType: headers["content-type"] || null,
      date: headers.date || null,
      lastModified: headers["last-modified"] || "absent",
      vary: headers.vary || null
    }
  };
}

async function captureOneRoute(options) {
  const {
    browser,
    expectedGtm,
    gtmId,
    index,
    outputDir,
    route,
    siteUrl
  } = options;
  const slug = routeSlug(route, index);
  const routePath = new URL(route, siteUrl).pathname;
  const routeEvidence = {
    allowedRequests: [],
    blockedRequests: [],
    blockedWebSockets: [],
    cacheBust: `hecmedia_verify=${Date.now()}-${index}`,
    checkedAt: new Date().toISOString(),
    consoleErrors: [],
    dataLayer: {
      bootstrapCount: 0,
      exists: false,
      gtmEventCount: 0,
      length: 0
    },
    dom: "",
    gtmLoaderRequests: [],
    gtmSemanticCaptures: [],
    gtmSemanticErrors: [],
    interactionDeclaration:
      "No click, scroll, media play, form submit, gtag call, conversion, or manufactured Realtime hit.",
    pageErrors: [],
    route,
    statusCode: 0,
    successfulNonAllowlistedRequests: []
  };
  const context = await browser.newContext({
    bypassCSP: false,
    ignoreHTTPSErrors: false,
    serviceWorkers: "block"
  });
  try {
    await context.clearCookies();
    await context.route("**/*", async intercepted => {
      const request = intercepted.request();
      const decision = classifyBrowserRequest(request.url(), gtmId, {
        method: request.method(),
        resourceType: request.resourceType(),
        routePath
      });
      let frameUrl = "";
      try {
        frameUrl = request.frame().url();
      } catch (error) {
        frameUrl = "unavailable";
      }
      const record = {
        at: new Date().toISOString(),
        category: decision.category,
        frameUrl,
        method: request.method(),
        resourceType: request.resourceType(),
        route,
        url: request.url()
      };
      if (decision.category === "exact-gtm-loader") {
        routeEvidence.allowedRequests.push(record);
        try {
          const fetched = await intercepted.fetch();
          const body = await fetched.body();
          const headers = fetched.headers();
          if (
            fetched.status() < 200 ||
            fetched.status() >= 300 ||
            !String(headers["content-type"] || "").includes(
              "application/javascript"
            )
          ) {
            throw new Error(
              `Exact GTM loader returned an invalid response: HTTP ${fetched.status()} ${headers[
                "content-type"
              ] || "missing content type"}.`
            );
          }
          const analysis = analyzeSource(body.toString("utf8"));
          assertExpectedResource(analysis, expectedGtm);
          routeEvidence.gtmSemanticCaptures.push({
            ...semanticEvidence(analysis, body, headers),
            status: fetched.status(),
            url: request.url()
          });
          await intercepted.fulfill({ body, response: fetched });
        } catch (error) {
          routeEvidence.gtmSemanticErrors.push(error.message || String(error));
          await intercepted.abort("blockedbyclient");
        }
      } else if (decision.allow) {
        routeEvidence.allowedRequests.push(record);
        await intercepted.continue();
      } else {
        routeEvidence.blockedRequests.push(record);
        await intercepted.abort("blockedbyclient");
      }
    });
    await context.routeWebSocket(/.*/, socket => {
      const record = {
        at: new Date().toISOString(),
        category: "blocked-websocket",
        frameUrl: "websocket-route",
        method: "WEBSOCKET",
        resourceType: "websocket",
        route,
        url: socket.url()
      };
      routeEvidence.blockedWebSockets.push(record);
      routeEvidence.blockedRequests.push(record);
      return socket.close({
        code: 1000,
        reason: "Blocked by non-polluting HEC production verifier"
      });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.clearBrowserCache");
    page.on("console", message => {
      if (message.type() === "error") {
        routeEvidence.consoleErrors.push({
          text: message.text(),
          url: (message.location() && message.location().url) || ""
        });
      }
    });
    page.on("pageerror", error => routeEvidence.pageErrors.push(String(error)));
    page.on("response", response => {
      const decision = classifyBrowserRequest(response.url(), gtmId, {
        method: response.request().method(),
        resourceType: response.request().resourceType(),
        routePath
      });
      if (decision.category === "exact-gtm-loader") {
        routeEvidence.gtmLoaderRequests.push({
          status: response.status(),
          url: response.url()
        });
      } else if (!decision.allow) {
        routeEvidence.successfulNonAllowlistedRequests.push({
          status: response.status(),
          url: response.url()
        });
      }
    });
    const separator = route.includes("?") ? "&" : "?";
    const response = await page.goto(
      `${siteUrl}${route}${separator}${routeEvidence.cacheBust}`,
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    await page.waitForTimeout(7000);
    routeEvidence.dom = await page.content();
    routeEvidence.dataLayer = await page.evaluate(() => {
      const value = window.dataLayer;
      const entries = Array.isArray(value) ? value : [];
      return {
        bootstrapCount: entries.filter(
          entry => entry && typeof entry === "object" && entry["gtm.start"]
        ).length,
        exists: Array.isArray(value),
        gtmEventCount: entries.filter(
          entry =>
            entry && typeof entry === "object" && entry.event === "gtm.js"
        ).length,
        length: entries.length
      };
    });
    routeEvidence.statusCode = response ? response.status() : 0;
    writeRouteEvidence(outputDir, slug, routeEvidence);
    try {
      assertBrowserGtmEvidence(routeEvidence, gtmId);
    } catch (error) {
      routeEvidence.failure = error.message || String(error);
      writeRouteEvidence(outputDir, slug, routeEvidence);
      throw error;
    }
    return routeEvidence;
  } catch (error) {
    if (!routeEvidence.failure) {
      routeEvidence.failure = error.message || String(error);
      writeRouteEvidence(outputDir, slug, routeEvidence);
    }
    throw error;
  } finally {
    await context.close();
  }
}

async function captureHydratedRoutes(options) {
  const {
    browserPath,
    expectedGtm,
    outputDir,
    routes,
    gtmId = EXACT_GTM_ID,
    siteUrl = "https://hecmedia.org"
  } = options;
  if (!browserPath || !fs.existsSync(browserPath)) {
    throw new Error(
      "BROWSER_BIN must name an installed Chrome or Chromium binary."
    );
  }
  assertExpectedResource(
    {
      ...expectedGtm,
      canonicalSha256: expectedGtm && expectedGtm.canonicalSha256,
      inventorySchema: INVENTORY_SCHEMA,
      inventorySha256: expectedGtm && expectedGtm.inventorySha256,
      resourceVersion: String(expectedGtm && expectedGtm.resourceVersion)
    },
    expectedGtm || {}
  );
  fs.mkdirSync(outputDir, { recursive: true });
  const chromium = playwrightChromium();
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"]
  });
  const aggregateOptions = {
    browserPath,
    browserVersion: browser.version(),
    gtmId,
    outputDir
  };
  const records = [];
  writeAggregateEvidence(aggregateOptions, records);
  try {
    await routes.reduce(
      (previous, route, index) =>
        previous.then(async () => {
          try {
            const record = await captureOneRoute({
              browser,
              expectedGtm,
              gtmId,
              index,
              outputDir,
              route,
              siteUrl
            });
            records.push(record);
          } catch (error) {
            records.push({
              checkedAt: new Date().toISOString(),
              failure: error.message || String(error),
              route
            });
            throw error;
          } finally {
            writeAggregateEvidence(aggregateOptions, records);
          }
        }),
      Promise.resolve()
    );
  } finally {
    await browser.close();
  }
  return records;
}

if (require.main === module) {
  const [command, browserPath] = process.argv.slice(2);
  if (command !== "--self-test") {
    console.error("Use --self-test <browser-path>.");
    process.exitCode = 1;
  } else {
    selfTestBrowser(browserPath)
      .then(result => console.log(JSON.stringify(result)))
      .catch(error => {
        console.error(error && error.stack ? error.stack : error);
        process.exitCode = 1;
      });
  }
}

module.exports = {
  EXACT_GTM_ID,
  assertBrowserGtmEvidence,
  captureHydratedRoutes,
  classifyBrowserRequest,
  isExactGtmLoader,
  selfTestBrowser
};
