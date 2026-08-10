#!/usr/bin/env node

const https = require("https");
const { URL } = require("url");

const siteUrl = process.env.PRODUCTION_SITE_URL;
const expectedSha = process.env.DEPLOY_SHA;
const expectedGtmId = "GTM-57RZPNN";
const aliases = (process.env.CLOUDFRONT_ALIASES || "")
  .split(",")
  .filter(Boolean)
  .sort();
const expectedAliases = ["hecmedia.org", "www.hecmedia.org"];
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
const routeTitles = {
  "/": "HEC-TV | Home",
  "/about-us": "HEC-TV | About Us",
  "/category/arts/two_on_the_aisle": "HEC-TV | Two_on_the_aisle",
  "/category/films": "HEC-TV | Films",
  "/events": "HEC-TV | Events",
  "/newsletter": "HEC-TV | Newsletter Signup",
  "/newsletter/thank-you": "HEC-TV | Newsletter Signup Complete",
  "/posts/hec-on-youtube": "HEC on YouTube"
};

function fail(message) {
  throw new Error(message);
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

function requireVerificationContract(env = process.env) {
  if (env.HECMEDIA_NO_SEND_FORMS !== "false") {
    fail("HECMEDIA_NO_SEND_FORMS must equal false for this release.");
  }
  if (env.HECMEDIA_EDGE_API !== "false") {
    fail("HECMEDIA_EDGE_API must equal false for this release.");
  }
  if (env.HECMEDIA_NEWSLETTER_MODE !== "omit") {
    fail("HECMEDIA_NEWSLETTER_MODE must equal omit for this release.");
  }
  if (env.GA_TAGMANAGER_ID !== expectedGtmId) {
    fail(`GA_TAGMANAGER_ID must equal ${expectedGtmId}.`);
  }
  return {
    expectedFormsMode: "false",
    expectedGtmId,
    expectedNewsletterMode: "omit",
    expectedSha: env.DEPLOY_SHA
  };
}

function request(route, options = {}) {
  const method = options.method || "GET";
  const body = options.body === undefined ? null : JSON.stringify(options.body);
  const baseUrl = options.baseUrl || siteUrl;
  const requestUrl = new URL(route, baseUrl);
  if (options.cacheBust) {
    requestUrl.searchParams.set("hecmedia_verify", options.cacheBust);
  }
  const headers = {
    Accept: "application/json,text/html",
    "Cache-Control": "no-cache",
    Pragma: "no-cache"
  };
  if (body !== null) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      requestUrl,
      { method, headers, timeout: 30000 },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            route,
            baseUrl,
            cacheBust: options.cacheBust || null,
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

function occurrences(value, needle) {
  return String(value || "").split(needle).length - 1;
}

function assertGtmMarkup(body, route, gtmId = expectedGtmId) {
  const ids = Array.from(
    new Set(String(body || "").match(/\bGTM-[A-Z0-9]+\b/g) || [])
  );
  if (ids.length !== 1 || ids[0] !== gtmId) {
    fail(`${route} did not render only the approved GTM container`);
  }
  const loader = "www.googletagmanager.com/gtm.js?id=";
  if (occurrences(body, loader) !== 1) {
    fail(`${route} did not render exactly one GTM loader`);
  }
  if (
    !String(body || "").includes("dataLayer") ||
    occurrences(body, "event:'gtm.js'") !== 1 ||
    /GTM-undefined|googletagmanager[^<]{0,500}undefined/i.test(body)
  ) {
    fail(`${route} rendered an invalid GTM dataLayer bootstrap`);
  }
}

function assertRouteIdentity(route, body, title) {
  if (/>404 not found\.</i.test(body) || /\b404\b/i.test(title)) {
    fail(`${route} rendered a 404/error document`);
  }
  if (!routeTitles[route] || title !== routeTitles[route]) {
    fail(`${route} rendered unexpected route identity: ${title || "missing"}`);
  }
  if (route === "/") {
    if (!/HEC-TV/.test(body)) fail("/ did not render the HEC-TV identity");
    if (!/Trending Now/.test(body)) fail("/ did not render Trending Now");
  }
  if (
    route === "/posts/hec-on-youtube" &&
    (!/HEC on YouTube/i.test(title) ||
      !/data-media-verification=["']article-content["']/i.test(body))
  ) {
    fail("/posts/hec-on-youtube did not render its article contract");
  }
  if (
    ["/category/films", "/category/arts/two_on_the_aisle"].includes(route) &&
    !/data-media-verification=["']post-list["']/i.test(body)
  ) {
    fail(`${route} did not render its post-list contract`);
  }
  if (route === "/events" && !/>Events(?: to display\.)?</i.test(body)) {
    fail("/events did not render its events contract");
  }
  if (
    route === "/newsletter" &&
    !/class=["'][^"']*newsletter-unavailable/i.test(body)
  ) {
    fail("/newsletter did not render the reviewed unavailable contract");
  }
  if (
    route === "/newsletter/thank-you" &&
    !/Thank you for subscribing|>Thank You</i.test(body)
  ) {
    fail("/newsletter/thank-you did not render its confirmation contract");
  }
}

function assertPage(result, contract = {}) {
  const { route, statusCode, body } = result;
  const releaseSha = contract.expectedSha || expectedSha;
  const formsMode = contract.expectedFormsMode || "false";
  const gtmId = contract.expectedGtmId || expectedGtmId;
  const newsletterMode = contract.expectedNewsletterMode || "omit";
  if (statusCode !== 200) fail(`${route} returned HTTP ${statusCode}`);
  if (!body.includes(`name="hecmedia-deploy-sha" content="${releaseSha}"`)) {
    fail(`${route} did not render the exact release SHA`);
  }
  if (!body.includes(`name="hecmedia-forms-mode" content="${formsMode}"`)) {
    fail(`${route} did not render the approved production forms mode`);
  }
  if (
    !body.includes(
      `name="hecmedia-newsletter-mode" content="${newsletterMode}"`
    )
  ) {
    fail(`${route} did not render the approved newsletter mode`);
  }
  const title = (body.match(/<title>(.*?)<\/title>/i) || [])[1] || "";
  if (!title || /undefined/i.test(title)) {
    fail(`${route} rendered an invalid title`);
  }
  assertRouteIdentity(route, body, title);
  assertGtmMarkup(body, route, gtmId);
}

function assertNewsletterApiAbsent(result) {
  if (result.statusCode !== 404) {
    fail(
      `GET /api/newsletter/subscribe returned HTTP ${result.statusCode}; expected 404 with the API omitted`
    );
  }
}

function buildPageVerificationChecks(
  aliasValues = aliases,
  routeValues = routes
) {
  return aliasValues.flatMap(alias =>
    ["normal", "fresh-1", "fresh-2"].flatMap(mode =>
      routeValues.map((route, index) => ({ alias, index, mode, route }))
    )
  );
}

function buildApiVerificationChecks(aliasValues = aliases) {
  return aliasValues.flatMap(alias =>
    ["normal", "fresh"].map(mode => ({
      alias,
      mode
    }))
  );
}

async function main() {
  if (!siteUrl || !/^[0-9a-f]{40}$/.test(expectedSha || "")) {
    fail("PRODUCTION_SITE_URL and an exact DEPLOY_SHA are required");
  }
  const contract = requireVerificationContract();
  assertTarget();

  // Keep production verification sequential to avoid manufacturing a burst of
  // Lambda@Edge cold starts against the public site.
  const pageChecks = buildPageVerificationChecks();
  const pages = await pageChecks.reduce(
    (previous, check) =>
      previous.then(async collected => {
        const page = await requestWithRetries(check.route, {
          baseUrl: `https://${check.alias}`,
          cacheBust:
            check.mode === "normal"
              ? undefined
              : `${Date.now()}-${check.mode}-${check.index}`
        });
        return [...collected, page];
      }),
    Promise.resolve([])
  );
  pages.forEach(page => assertPage(page, contract));

  const apiChecks = await buildApiVerificationChecks().reduce(
    (previous, check) =>
      previous.then(async collected => {
        const getApi = await requestWithRetries("/api/newsletter/subscribe", {
          baseUrl: `https://${check.alias}`,
          cacheBust: check.mode === "fresh" ? `${Date.now()}-api` : undefined
        });
        assertNewsletterApiAbsent(getApi);
        return [
          ...collected,
          {
            alias: check.alias,
            mode: check.mode,
            statusCode: getApi.statusCode
          }
        ];
      }),
    Promise.resolve([])
  );

  console.log(
    JSON.stringify({
      siteUrl,
      expectedSha,
      aliases,
      routes,
      normalPassesPerAlias: 1,
      freshPassesPerAlias: 2,
      gtmId: expectedGtmId,
      formsMode: contract.expectedFormsMode,
      newsletterMode: contract.expectedNewsletterMode,
      newsletterApi: { mode: "absent", checks: apiChecks }
    })
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  assertGtmMarkup,
  assertNewsletterApiAbsent,
  assertPage,
  assertRouteIdentity,
  buildApiVerificationChecks,
  buildPageVerificationChecks,
  occurrences,
  requireVerificationContract
};
