#!/usr/bin/env node

const https = require("https");
const { URL } = require("url");

const siteUrl = process.env.PRODUCTION_SITE_URL;
const expectedSha = process.env.DEPLOY_SHA;
const aliases = (process.env.CLOUDFRONT_ALIASES || "")
  .split(",")
  .filter(Boolean)
  .sort();
const expectedAliases = ["hecmedia.org", "www.hecmedia.org"];
const expectedGtmContainerId = "GTM-57RZPNN";
const youtubeRoute = "/posts/hec-on-youtube";
const routes = [
  "/",
  "/events",
  "/about-us",
  "/newsletter",
  "/newsletter/thank-you",
  "/category/films",
  "/category/arts/two_on_the_aisle",
  "/posts/hec-on-youtube"
];

function fail(message) {
  throw new Error(message);
}

function occurrences(body, value) {
  return String(body || "").split(value).length - 1;
}

function titleFromHtml(body) {
  return (String(body || "").match(/<title>(.*?)<\/title>/i) || [])[1] || "";
}

function assertRenderedSiteIdentity(body, route) {
  if (/>404 not found\.</i.test(body)) {
    fail(`${route} rendered a 404 page`);
  }
  const title = titleFromHtml(body);
  if (!title || /undefined/i.test(title)) {
    fail(`${route} rendered an invalid title`);
  }
  if (route === youtubeRoute) {
    if (title.trim() !== "HEC on YouTube") {
      fail(`${route} did not render the HEC on YouTube identity`);
    }
    return title;
  }
  if (!/^HEC-TV(?:\s*\||$)/.test(title.trim())) {
    fail(`${route} did not render the HEC-TV identity`);
  }
  return title;
}

function assertOnlyApprovedGtmIds(body, route) {
  const html = String(body || "");
  if (/GTM-(?:undefined|null)/i.test(html)) {
    fail(`${route} rendered an undefined GTM container`);
  }
  const ids = html.match(/GTM-[A-Za-z0-9-]+/g) || [];
  if (
    ids.length === 0 ||
    ids.some(containerId => containerId !== expectedGtmContainerId)
  ) {
    fail(`${route} rendered a missing or unapproved GTM container`);
  }
  return ids;
}

function assertLiveGtmMarkup(body, route) {
  const html = String(body || "");
  const ids = assertOnlyApprovedGtmIds(html, route);
  if (ids.length !== 1) {
    fail(
      `${route} must render exactly one approved ${expectedGtmContainerId} bootstrap reference`
    );
  }
  if (occurrences(html, "googletagmanager.com/gtm.js?id=") !== 1) {
    fail(`${route} did not render exactly one GTM loader bootstrap`);
  }
  if (occurrences(html, "event:'gtm.js'") !== 1) {
    fail(`${route} did not render exactly one GTM dataLayer bootstrap`);
  }
}

function assertTarget() {
  const target = new URL(siteUrl);
  if (
    target.protocol !== "https:" ||
    target.hostname !== "hecmedia.org" ||
    target.pathname !== "/"
  ) {
    fail("Production target must be exactly https://hecmedia.org/.");
  }
  if (aliases.join(",") !== expectedAliases.join(",")) {
    fail(
      "CloudFront aliases must be exactly hecmedia.org and www.hecmedia.org."
    );
  }
}

function request(route, options = {}) {
  const method = options.method || "GET";
  const body = options.body === undefined ? null : JSON.stringify(options.body);
  const headers = { Accept: "application/json,text/html" };
  if (body !== null) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      new URL(route, siteUrl),
      { method, headers, timeout: 30000 },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            route,
            method,
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8")
          })
        );
      }
    );
    req.on("timeout", () =>
      req.destroy(new Error(`${method} ${route} timed out`))
    );
    req.on("error", reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function requestWithRetries(route, options = {}, attempts = 5) {
  try {
    const result = await request(route, options);
    if (result.statusCode >= 500 && attempts > 1) {
      await delay(3000);
      return requestWithRetries(route, options, attempts - 1);
    }
    return result;
  } catch (error) {
    if (attempts <= 1) throw error;
    await delay(3000);
    return requestWithRetries(route, options, attempts - 1);
  }
}

function assertPage(result) {
  const { route, statusCode, body } = result;
  if (statusCode !== 200) fail(`${route} returned HTTP ${statusCode}`);
  assertRenderedSiteIdentity(body, route);
  assertLiveGtmMarkup(body, route);
  if (route === "/" && !/Trending Now/.test(body)) {
    fail("/ did not render Trending Now");
  }
  if (!body.includes(`name="hecmedia-deploy-sha" content="${expectedSha}"`)) {
    fail(`${route} did not render the exact release SHA`);
  }
  if (!body.includes('name="hecmedia-forms-mode" content="false"')) {
    fail(`${route} is not in send-enabled production forms mode`);
  }
}

function assertJsonResponse(result, expectedStatus) {
  if (result.statusCode !== expectedStatus) {
    fail(
      `${result.method} ${result.route} returned HTTP ${result.statusCode}; expected ${expectedStatus}`
    );
  }
  if (
    !String(result.headers["content-type"] || "").includes("application/json")
  ) {
    fail(`${result.method} ${result.route} did not return JSON`);
  }
  try {
    return JSON.parse(result.body);
  } catch (error) {
    fail(`${result.method} ${result.route} returned invalid JSON`);
    return null;
  }
}

async function main() {
  if (!siteUrl || !/^[0-9a-f]{40}$/.test(expectedSha || "")) {
    fail("PRODUCTION_SITE_URL and an exact DEPLOY_SHA are required");
  }
  assertTarget();

  // Keep production verification sequential to avoid manufacturing a burst of
  // Lambda@Edge cold starts against the public site.
  const pages = await routes.reduce(
    (pendingPages, route) =>
      pendingPages.then(async resolvedPages => [
        ...resolvedPages,
        await requestWithRetries(route)
      ]),
    Promise.resolve([])
  );
  pages.forEach(assertPage);

  const getApi = await requestWithRetries("/api/newsletter/subscribe");
  const getJson = assertJsonResponse(getApi, 405);
  if (getJson.ok !== false) fail("Newsletter GET did not fail closed");

  const invalidPost = await requestWithRetries("/api/newsletter/subscribe", {
    method: "POST",
    body: {}
  });
  const invalidJson = assertJsonResponse(invalidPost, 400);
  if (invalidJson.ok !== false || !invalidJson.errors) {
    fail("Newsletter invalid POST did not return validation errors");
  }

  console.log(
    JSON.stringify({
      siteUrl,
      expectedSha,
      aliases,
      routes,
      newsletterApi: {
        get: getApi.statusCode,
        invalidPost: invalidPost.statusCode
      }
    })
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  assertLiveGtmMarkup,
  assertOnlyApprovedGtmIds,
  assertPage,
  assertRenderedSiteIdentity,
  expectedGtmContainerId,
  titleFromHtml
};
