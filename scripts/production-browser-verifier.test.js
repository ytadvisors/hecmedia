const fs = require("fs");
const path = require("path");
const {
  assertBrowserGtmEvidence,
  classifyBrowserRequest,
  isExactGtmLoader
} = require("./production-browser-verifier");

const exactLoader = "https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN";

test("allows only first-party, approved media, and the exact GTM loader", () => {
  expect(
    classifyBrowserRequest("https://hecmedia.org/_next/app.js")
  ).toMatchObject({
    allow: true,
    category: "first-party-read"
  });
  expect(
    classifyBrowserRequest(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/a.jpg"
    )
  ).toMatchObject({ allow: true, category: "approved-media-read" });
  expect(
    classifyBrowserRequest(
      "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/education.jpg"
    )
  ).toMatchObject({ allow: true, category: "approved-media-read" });
  expect(
    classifyBrowserRequest(
      "https://asset.ytadvisors.com/unreviewed/tracking-pixel.gif"
    )
  ).toMatchObject({ allow: false, category: "media-path-refused" });
  expect(classifyBrowserRequest(exactLoader)).toMatchObject({
    allow: true,
    category: "exact-gtm-loader"
  });
  expect(
    classifyBrowserRequest("https://www.google-analytics.com/g/collect")
  ).toMatchObject({ allow: false });
  expect(
    classifyBrowserRequest("https://connect.facebook.net/en_US/fbevents.js")
  ).toMatchObject({ allow: false });
  expect(
    classifyBrowserRequest("https://hecmedia.org/api/newsletter/subscribe")
  ).toMatchObject({ allow: false, category: "first-party-path-refused" });
  expect(
    classifyBrowserRequest("https://hecmedia.org/events", undefined, {
      method: "POST",
      resourceType: "document",
      routePath: "/events"
    })
  ).toMatchObject({ allow: false, category: "write-method" });
});

test("rejects GTM loader variants and extra query parameters", () => {
  expect(isExactGtmLoader(exactLoader)).toBe(true);
  expect(isExactGtmLoader(`${exactLoader}&gtm_auth=unexpected`)).toBe(false);
  expect(
    isExactGtmLoader("https://www.googletagmanager.com/gtm.js?id=GTM-WRONG")
  ).toBe(false);
  expect(
    isExactGtmLoader(
      "https://user@www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"
    )
  ).toBe(false);
});

function evidence(overrides = {}) {
  return {
    consoleErrors: [],
    dataLayer: { bootstrapCount: 1, exists: true, gtmEventCount: 1 },
    gtmLoaderRequests: [{ status: 200, url: exactLoader }],
    gtmSemanticCaptures: [
      {
        canonicalSha256: "c".repeat(64),
        fetchedUrl: exactLoader,
        inventorySha256: "d".repeat(64),
        redirectDisposition: "disabled-zero-followed",
        status: 200,
        resourceVersion: "21"
      }
    ],
    gtmSemanticErrors: [],
    pageErrors: [],
    route: "/",
    statusCode: 200,
    successfulNonAllowlistedRequests: [],
    ...overrides
  };
}

test("requires one successful loader and one dataLayer bootstrap", () => {
  expect(() => assertBrowserGtmEvidence(evidence())).not.toThrow();
  expect(() =>
    assertBrowserGtmEvidence(evidence({ gtmLoaderRequests: [] }))
  ).toThrow("semantically approved GTM loader");
  expect(() =>
    assertBrowserGtmEvidence(
      evidence({
        dataLayer: { bootstrapCount: 2, exists: true, gtmEventCount: 2 }
      })
    )
  ).toThrow("bootstrap dataLayer exactly once");
  expect(() =>
    assertBrowserGtmEvidence(
      evidence({
        gtmSemanticCaptures: [
          {
            fetchedUrl: "https://redirected.invalid/gtm.js",
            redirectDisposition: "followed",
            status: 200
          }
        ]
      })
    )
  ).toThrow("semantically approved GTM loader");
});

test("fails on successful non-allowlisted traffic or browser errors", () => {
  expect(() =>
    assertBrowserGtmEvidence(
      evidence({
        successfulNonAllowlistedRequests: [
          { status: 204, url: "https://www.google-analytics.com/g/collect" }
        ]
      })
    )
  ).toThrow("completed a non-allowlisted request");
  expect(() =>
    assertBrowserGtmEvidence(
      evidence({ pageErrors: ["TypeError: analytics bootstrap failed"] })
    )
  ).toThrow("GTM/CSP/JavaScript error");
});

test("installs a context-level WebSocket firewall before navigation", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "production-browser-verifier.js"),
    "utf8"
  );
  const socketFirewall = source.indexOf("context.routeWebSocket");
  const navigation = source.indexOf("page.goto", socketFirewall);
  expect(socketFirewall).toBeGreaterThan(-1);
  expect(navigation).toBeGreaterThan(socketFirewall);
  expect(source).not.toContain("connectToServer(");
  expect(source).toContain("forbidden-http");
  expect(source).toContain("forbidden-websocket");
  expect(source).toContain("serverHits.forbiddenHttp !== 0");
  expect(source).toContain("serverHits.forbiddenWebsocket !== 0");
  expect(source).toContain("maxRedirects: 0");
  expect(source).toContain("serverHits.redirectDestination !== 0");
  expect(source).toContain("redirectProbe.semanticCaptures !== 0");
});

test("requires the exact production route and cache-bust query for documents", () => {
  expect(
    classifyBrowserRequest(
      "https://hecmedia.org/events?hecmedia_verify=proof",
      undefined,
      { method: "GET", resourceType: "document", routePath: "/events" }
    )
  ).toMatchObject({ allow: true, category: "first-party-read" });
  expect(
    classifyBrowserRequest("https://hecmedia.org/about-us", undefined, {
      method: "GET",
      resourceType: "document",
      routePath: "/events"
    })
  ).toMatchObject({ allow: false });
});
