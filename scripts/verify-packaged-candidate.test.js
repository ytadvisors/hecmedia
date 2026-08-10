const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  createCloudFrontRequestEvent,
  decodeLambdaResponse,
  verifyPackagedCandidate
} = require("./verify-packaged-candidate");

const releaseSha = "a".repeat(40);

function buildEnv() {
  return {
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    DEPLOY_SHA: releaseSha,
    EXPECTED_GTM_CANONICAL_SHA256: "c".repeat(64),
    EXPECTED_GTM_COUNTS: "22/34/31/18",
    EXPECTED_GTM_INVENTORY_SHA256: "d".repeat(64),
    EXPECTED_GTM_RESOURCE_VERSION: "21",
    GA_TAGMANAGER_ID: "GTM-57RZPNN",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_EDGE_API: "false",
    HECMEDIA_MODERN_WPGRAPHQL: "true",
    HECMEDIA_NEWSLETTER_MODE: "omit",
    HECMEDIA_NO_SEND_FORMS: "false",
    RE_CAPTCHA_SITE_KEY: "6Lf8RFAUAAAAAPArR_euM1R2KgaGujAOUAofjdZo",
    SITE_HOST: "https://hecmedia.org",
    WP_HOST: "https://prod-wp.hectv.org"
  };
}

function gtmMarkup() {
  return [
    "<script>",
    "window.dataLayer=window.dataLayer||[];",
    "window.dataLayer.push({'gtm.start':1,event:'gtm.js'});",
    "j.src='https://www.googletagmanager.com/gtm.js?id='+i;",
    "})(window,document,'script','dataLayer','GTM-57RZPNN');",
    "</script>"
  ].join("");
}

function routeHtml(route) {
  const contracts = {
    "/": ["HEC-TV | Home", "HEC-TV Trending Now"],
    "/category/films": [
      "HEC-TV | Films",
      '<main data-media-verification="post-list">Films</main>'
    ],
    "/newsletter": [
      "HEC-TV | Newsletter Signup",
      '<main class="newsletter-unavailable">Unavailable</main>'
    ],
    "/posts/hec-on-youtube": [
      "HEC on YouTube",
      '<article data-media-verification="article-content">Video</article>'
    ]
  };
  const [title, content] = contracts[route];
  return [
    `<title>${title}</title>`,
    `<meta name="hecmedia-deploy-sha" content="${releaseSha}"/>`,
    '<meta name="hecmedia-forms-mode" content="false"/>',
    '<meta name="hecmedia-newsletter-mode" content="omit"/>',
    content,
    gtmMarkup()
  ].join("");
}

test("builds a GET-only CloudFront origin-request event", () => {
  const event = createCloudFrontRequestEvent("/newsletter", "proof");
  const {
    cf: { request }
  } = event.Records[0];
  expect(event.Records[0].cf.config.eventType).toBe("origin-request");
  expect(request).toMatchObject({
    method: "GET",
    querystring: "hecmedia_packaged_verify=proof",
    uri: "/newsletter"
  });
  expect(request).not.toHaveProperty("body");
});

test("renders and records the exact packaged route contracts", async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "hec-package-"));
  const handler = jest.fn(async event => {
    const route = event.Records[0].cf.request.uri;
    return {
      body: Buffer.from(routeHtml(route)).toString("base64"),
      bodyEncoding: "base64",
      status: "200"
    };
  });
  try {
    const summary = await verifyPackagedCandidate({
      env: buildEnv(),
      handler,
      outputDir
    });
    expect(summary.routes).toHaveLength(4);
    expect(handler).toHaveBeenCalledTimes(4);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(outputDir, "packaged-candidate-smoke.json"),
          "utf8"
        )
      ).releaseSha
    ).toBe(releaseSha);
  } finally {
    fs.rmSync(outputDir, { force: true, recursive: true });
  }
});

test("rejects an origin request passthrough instead of an SSR response", () => {
  expect(() => decodeLambdaResponse({ method: "GET", uri: "/" }, "/")).toThrow(
    "did not return an SSR response"
  );
});
