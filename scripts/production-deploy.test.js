const path = require("path");

const realFs = jest.requireActual("fs");
const {
  API_PATH,
  SANITIZED_ROLLBACK_ARN,
  SANITIZED_ROLLBACK_CODE_SHA256,
  assertDistributionContract,
  assertBrowserAcceptanceEvidence,
  assertFunctionContract,
  assertGovernedDeployContext,
  assertHydratedImageSources,
  assertHydratedNavigation,
  assertRemoteImageResponse,
  configureProductionDistribution,
  configureSanitizedRollback,
  extractRemoteImageUrls,
  isApprovedBrowserRequest,
  parseJsonOutput,
  publishedVersionFromArn,
  requireBuildContract
} = require("./production-deploy");
const {
  CANONICAL_ARTS_PROGRAM_ROUTE,
  HYDRATED_MEDIA_REQUIREMENTS,
  PRODUCTION_ROUTES
} = require("./production-route-contract");

const defaultBase =
  "arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd";
const apiBase = "arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-api";
const baselineDefault = `${defaultBase}:146`;

function associations(version) {
  return {
    Quantity: 2,
    Items: [
      {
        EventType: "origin-request",
        IncludeBody: false,
        LambdaFunctionARN: version
      },
      {
        EventType: "origin-response",
        IncludeBody: false,
        LambdaFunctionARN: version
      }
    ]
  };
}

function distribution() {
  return {
    Aliases: { Quantity: 2, Items: ["www.hecmedia.org", "hecmedia.org"] },
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "x2l4ew-k0m7umi",
          DomainName: "x2l4ew-k0m7umi.s3.us-east-1.amazonaws.com"
        }
      ]
    },
    DefaultCacheBehavior: {
      TargetOriginId: "x2l4ew-k0m7umi",
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 2,
        Items: ["HEAD", "GET"],
        CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
      },
      LambdaFunctionAssociations: associations(baselineDefault)
    },
    CacheBehaviors: {
      Quantity: 2,
      Items: [
        {
          PathPattern: "_next/data/*",
          TargetOriginId: "x2l4ew-k0m7umi",
          LambdaFunctionAssociations: associations(baselineDefault)
        },
        {
          PathPattern: "_next/static/*",
          TargetOriginId: "x2l4ew-k0m7umi",
          LambdaFunctionAssociations: { Quantity: 0, Items: [] }
        }
      ]
    }
  };
}

function buildEnv() {
  return {
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    WP_HOST: "https://prod-wp.hectv.org",
    SITE_HOST: "https://hecmedia.org",
    HECMEDIA_NO_SEND_FORMS: "false",
    HECMEDIA_EDGE_API: "true",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_MODERN_WPGRAPHQL: "true",
    DEPLOY_SHA: "a".repeat(40),
    RE_CAPTCHA_SITE_KEY: `6L${"a".repeat(38)}`,
    GA_TAGMANAGER_ID: "GTM-57RZPNN"
  };
}

function governedEnv(action = "deploy") {
  return {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_WORKFLOW_REF:
      "ytadvisors/hecmedia/.github/workflows/production-deploy.yml@refs/heads/master",
    GITHUB_ACTOR: "yt-agent-tom-gpt",
    HECMEDIA_PRODUCTION_REQUEST_TASK_ID: "86634",
    DEPLOY_SHA: "a".repeat(40),
    PRODUCTION_CONFIRMATION:
      action === "rollback"
        ? "ROLLBACK HEC FRONTEND PRODUCTION"
        : "DEPLOY HEC FRONTEND PRODUCTION"
  };
}

test("requires the exact send-enabled production build contract", () => {
  expect(() => requireBuildContract(buildEnv())).not.toThrow();
  expect(() =>
    requireBuildContract({ ...buildEnv(), HECMEDIA_NO_SEND_FORMS: "true" })
  ).toThrow("HECMEDIA_NO_SEND_FORMS must equal false");
  expect(() =>
    requireBuildContract({
      ...buildEnv(),
      APOLLO_CLIENT_URI: "https://example.org"
    })
  ).toThrow("APOLLO_CLIENT_URI must equal");
  expect(() =>
    requireBuildContract({ ...buildEnv(), GA_TAGMANAGER_ID: "" })
  ).toThrow("GA_TAGMANAGER_ID must equal GTM-57RZPNN");
  expect(() =>
    requireBuildContract({ ...buildEnv(), GA_TAGMANAGER_ID: "G-NOT-GTM" })
  ).toThrow("GA_TAGMANAGER_ID must equal GTM-57RZPNN");
  // Valid GTM syntax but not the approved production container.
  expect(() =>
    requireBuildContract({ ...buildEnv(), GA_TAGMANAGER_ID: "GTM-AAAA" })
  ).toThrow("GA_TAGMANAGER_ID must equal GTM-57RZPNN");
});

test("parseJsonOutput treats empty get-bucket-versioning stdout as unversioned {}", () => {
  // AWS CLI returns empty body when bucket versioning was never configured.
  expect(parseJsonOutput("", { allowEmptyObject: true })).toEqual({});
  expect(parseJsonOutput("   \n", { allowEmptyObject: true })).toEqual({});
  expect(parseJsonOutput('{"Status":"Enabled"}')).toEqual({
    Status: "Enabled"
  });
  expect(parseJsonOutput(null, { allowEmptyObject: true })).toEqual({});
  expect(() => parseJsonOutput("")).toThrow(/empty stdout/);
  expect(() => parseJsonOutput("not-json")).toThrow(/parse failed/);
});

test("production verification requires hydrated primary navigation items", () => {
  expect(() =>
    assertHydratedNavigation(
      '<ul class="pull-left top-navigation left-links"><li>Arts</li></ul>',
      "/"
    )
  ).not.toThrow();
  expect(() =>
    assertHydratedNavigation(
      '<ul class="pull-left top-navigation left-links"></ul>',
      "/"
    )
  ).toThrow("has no primary navigation items");
});

test("hydrated verifier uses the route-appropriate YouTube identity contract", () => {
  const script = realFs.readFileSync(
    path.join(__dirname, "production-deploy.js"),
    "utf8"
  );
  expect(script).toContain("assertRenderedSiteIdentity(dom, route)");
  expect(script).not.toContain('!dom.includes("HEC-TV")');
});

test("production verifiers share the populated canonical Arts program route", () => {
  expect(CANONICAL_ARTS_PROGRAM_ROUTE).toBe(
    "/category/arts/two-on-the-aisle"
  );
  expect(PRODUCTION_ROUTES).toContain(CANONICAL_ARTS_PROGRAM_ROUTE);
  expect(HYDRATED_MEDIA_REQUIREMENTS[CANONICAL_ARTS_PROGRAM_ROUTE]).toEqual({
    minimum: 1,
    surface: "post-list"
  });
  expect(PRODUCTION_ROUTES).not.toContain(
    "/category/arts/two_on_the_aisle"
  );
});

test("browser acceptance requires one exact GTM loader and dataLayer bootstrap", () => {
  const exactEvidence = {
    consoleErrors: [],
    dataLayer: { gtmJsEvents: 1, gtmStartEvents: 1 },
    gtmLoaderResponses: [
      {
        status: 200,
        url: "https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"
      }
    ],
    gtmLoaderUrls: ["https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"],
    hasHecYoutubeLink: true,
    newsletterForm: {
      consentCount: 1,
      consentEnabled: true,
      consentVisible: true,
      emailCount: 1,
      emailEditable: true,
      emailVisible: true,
      formCount: 1,
      formVisible: true,
      submitCount: 1,
      submitEnabled: true,
      submitVisible: true
    },
    pageErrors: [],
    route: "/newsletter",
    statusCode: 200
  };
  expect(() => assertBrowserAcceptanceEvidence(exactEvidence)).not.toThrow();
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      gtmLoaderUrls: ["https://www.googletagmanager.com/gtm.js?id=GTM-WRONG"]
    })
  ).toThrow("exactly one approved GTM loader");
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      gtmLoaderResponses: [
        {
          status: 503,
          url: "https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"
        }
      ]
    })
  ).toThrow("HTTP 200");
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      dataLayer: { gtmJsEvents: 2, gtmStartEvents: 2 }
    })
  ).toThrow("window.dataLayer exactly once");
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      consoleErrors: ["Refused to load script due to CSP"]
    })
  ).toThrow("console, CSP, or runtime error");
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      newsletterForm: {
        ...exactEvidence.newsletterForm,
        formVisible: false
      }
    })
  ).toThrow("visible, send-enabled form controls");
  expect(() =>
    assertBrowserAcceptanceEvidence({
      ...exactEvidence,
      newsletterForm: {
        ...exactEvidence.newsletterForm,
        emailEditable: false,
        submitEnabled: false
      }
    })
  ).toThrow("visible, send-enabled form controls");
});

test("browser acceptance permits only reviewed production, GTM, and form resources", () => {
  expect(
    isApprovedBrowserRequest(
      "https://www.google-analytics.com/g/collect?v=2&tid=G-TEST"
    )
  ).toBe(false);
  expect(
    isApprovedBrowserRequest(
      "https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"
    )
  ).toBe(true);
  expect(
    isApprovedBrowserRequest(
      "https://www.googletagmanager.com/gtm.js?id=GTM-WRONG"
    )
  ).toBe(false);
  expect(
    isApprovedBrowserRequest(
      "https://www.google.com/recaptcha/api2/anchor?ar=1"
    )
  ).toBe(true);
});

test("production verification inventories src and srcset candidates", () => {
  const dom = [
    '<img src="/static/assets/logo.png">',
    '<section data-media-verification="post-list">',
    '<img src="https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story.jpg?x=1&amp;y=2" srcset="https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story-small.jpg 320w, https://media.example.com/story-large.jpg 1280w">',
    "</section>",
    '<img src="https://media.example.com/story.jpg?x=1&amp;y=2">',
    "<img src='https://media.example.com/second.jpg'>"
  ].join("");

  expect(extractRemoteImageUrls(dom)).toEqual([
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story.jpg?x=1&y=2",
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story-small.jpg",
    "https://media.example.com/story-large.jpg",
    "https://media.example.com/story.jpg?x=1&y=2",
    "https://media.example.com/second.jpg"
  ]);
  expect(assertHydratedImageSources(dom, "/")).toMatchObject({
    imageUrls: expect.any(Array),
    mediaImageUrls: [
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story.jpg?x=1&y=2",
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story-small.jpg"
    ],
    minimumMediaImages: 1,
    verificationSurface: "post-list"
  });
});

test("production verification ignores noscript fallback pixels", () => {
  const contentImage =
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story.jpg";
  const dom = [
    '<noscript><img src="https://www.facebook.com/tr?id=420290078314527&amp;ev=PageView&amp;noscript=1"></noscript>',
    '<section data-media-verification="post-list">',
    `<img src="${contentImage}">`,
    "</section>",
    '<img src="https://media.example.com/navigation.jpg">'
  ].join("");

  expect(extractRemoteImageUrls(dom)).toEqual([
    contentImage,
    "https://media.example.com/navigation.jpg"
  ]);
  expect(assertHydratedImageSources(dom, "/")).toMatchObject({
    imageUrls: [contentImage, "https://media.example.com/navigation.jpg"],
    mediaImageUrls: [contentImage],
    minimumMediaImages: 1,
    verificationSurface: "post-list"
  });
});

test("production verification rejects promo-only content route inventories", () => {
  expect(() =>
    assertHydratedImageSources(
      '<img src="https://asset.ytadvisors.com/hectv/promo.jpg"><section data-media-verification="post-list"><p>No cards</p></section>',
      "/"
    )
  ).toThrow("has 0 production media image candidate(s)");
});

test("production verification scopes article proof to article content", () => {
  const articleImage =
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/article.jpg";
  const relatedImage =
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/related.jpg";
  const articleDom = [
    '<div data-media-verification="article-content">',
    `<div><p><img src="${articleImage}"></p></div>`,
    "</div>",
    `<section><img src="${relatedImage}"></section>`
  ].join("");

  expect(
    assertHydratedImageSources(articleDom, "/posts/hec-on-youtube")
  ).toMatchObject({
    mediaImageUrls: [articleImage],
    verificationSurface: "article-content"
  });
  expect(() =>
    assertHydratedImageSources(
      `<div data-media-verification="article-content"><p>No banners</p></div><img src="${relatedImage}">`,
      "/posts/hec-on-youtube"
    )
  ).toThrow("in article-content; requires at least 1");
});

test("production verification allows utility routes with no remote images", () => {
  expect(
    assertHydratedImageSources(
      '<img src="/static/assets/newsletter-illustration.png">',
      "/newsletter"
    )
  ).toMatchObject({
    imageUrls: [],
    mediaImageUrls: [],
    minimumMediaImages: 0
  });
});

test("production verification requires an image response from rendered URLs", () => {
  expect(() =>
    assertRemoteImageResponse("https://media.example.com/story.jpg", "/", {
      status: 0,
      stdout: "206\timage/jpeg",
      stderr: ""
    })
  ).not.toThrow();
  expect(() =>
    assertRemoteImageResponse("https://media.example.com/story.jpg", "/", {
      status: 0,
      stdout: "200\ttext/html",
      stderr: ""
    })
  ).toThrow("returned non-image content type text/html");
  expect(() =>
    assertRemoteImageResponse("https://media.example.com/missing.jpg", "/", {
      status: 22,
      stdout: "404\ttext/html",
      stderr: "curl: (22) The requested URL returned error: 404"
    })
  ).toThrow("has a broken image");
});

test("allows production mutation only from the governed workflow", () => {
  expect(() => assertGovernedDeployContext(governedEnv())).not.toThrow();
  expect(() => assertGovernedDeployContext({}, "deploy")).toThrow(
    "governed production-deploy workflow_dispatch"
  );
  expect(() =>
    assertGovernedDeployContext(
      { ...governedEnv(), GITHUB_ACTOR: "unknown-agent" },
      "deploy"
    )
  ).toThrow("not an approved HEC production publisher");
  expect(() =>
    assertGovernedDeployContext(
      { ...governedEnv(), HECMEDIA_PRODUCTION_REQUEST_TASK_ID: "0" },
      "deploy"
    )
  ).toThrow("positive HEC production queue-task receipt");
});

test("requires a distinct explicit confirmation for rollback", () => {
  expect(() =>
    assertGovernedDeployContext(governedEnv("rollback"), "rollback")
  ).not.toThrow();
  expect(() => assertGovernedDeployContext(governedEnv(), "rollback")).toThrow(
    "confirmation phrase"
  );
});

test("pins the existing Lambda runtime contract before code mutation", () => {
  const config = {
    FunctionArn: defaultBase,
    Runtime: "nodejs24.x",
    Handler: "index.handler",
    Role: "arn:aws:iam::850335719356:role/x2l4ew-0kb1zus",
    Timeout: 30,
    MemorySize: 3000,
    PackageType: "Zip",
    State: "Active",
    LastUpdateStatus: "Successful",
    Architectures: ["x86_64"]
  };
  expect(() => assertFunctionContract(config, defaultBase, 3000)).not.toThrow();
  expect(() =>
    assertFunctionContract(
      { ...config, Runtime: "nodejs22.x" },
      defaultBase,
      3000
    )
  ).toThrow("Lambda runtime contract drifted");
});

test("atomically replaces four SSR associations and adds the exact API behavior", () => {
  const nextDefault = `${defaultBase}:149`;
  const nextApi = `${apiBase}:4`;
  const configured = configureProductionDistribution(
    distribution(),
    baselineDefault,
    "none",
    nextDefault,
    nextApi
  );

  const owned = [
    ...configured.DefaultCacheBehavior.LambdaFunctionAssociations.Items,
    ...configured.CacheBehaviors.Items.find(
      behavior => behavior.PathPattern === "_next/data/*"
    ).LambdaFunctionAssociations.Items
  ];
  expect(owned).toHaveLength(4);
  expect(owned.every(item => item.LambdaFunctionARN === nextDefault)).toBe(
    true
  );

  const api = configured.CacheBehaviors.Items.find(
    behavior => behavior.PathPattern === API_PATH
  );
  expect(api.LambdaFunctionAssociations).toEqual({
    Quantity: 1,
    Items: [
      {
        LambdaFunctionARN: nextApi,
        EventType: "origin-request",
        IncludeBody: true
      }
    ]
  });
  expect(api.DefaultTTL).toBe(0);
  expect(api.MaxTTL).toBe(0);
});

test("supports a subsequent release only from the exact API baseline", () => {
  const firstDefault = `${defaultBase}:149`;
  const firstApi = `${apiBase}:4`;
  const first = configureProductionDistribution(
    distribution(),
    baselineDefault,
    "none",
    firstDefault,
    firstApi
  );
  expect(() =>
    assertDistributionContract(first, firstDefault, firstApi)
  ).not.toThrow();
  expect(() => assertDistributionContract(first, firstDefault, "none")).toThrow(
    "authorized baseline says none"
  );

  expect(() =>
    configureProductionDistribution(
      first,
      firstDefault,
      `${apiBase}:3`,
      `${defaultBase}:150`,
      `${apiBase}:5`
    )
  ).toThrow("API baseline drifted");
});

test("refuses alias, origin, or Lambda baseline drift", () => {
  const wrongAlias = distribution();
  wrongAlias.Aliases.Items = ["hecmedia.org"];
  expect(() => assertDistributionContract(wrongAlias, baselineDefault)).toThrow(
    "aliases changed"
  );

  const wrongOrigin = distribution();
  wrongOrigin.Origins.Items[0].DomainName = "other.example.org";
  expect(() =>
    assertDistributionContract(wrongOrigin, baselineDefault)
  ).toThrow("S3 origin contract changed");

  const wrongVersion = distribution();
  wrongVersion.DefaultCacheBehavior.LambdaFunctionAssociations.Items[0].LambdaFunctionARN = `${defaultBase}:145`;
  expect(() =>
    assertDistributionContract(wrongVersion, baselineDefault)
  ).toThrow("Lambda version drifted");
});

test("rollback always restores sanitized version 153 and removes the API behavior", () => {
  const released = configureProductionDistribution(
    distribution(),
    baselineDefault,
    "none",
    `${defaultBase}:149`,
    `${apiBase}:4`
  );
  const rolledBack = configureSanitizedRollback(released);
  const allAssociations = [
    ...rolledBack.DefaultCacheBehavior.LambdaFunctionAssociations.Items,
    ...rolledBack.CacheBehaviors.Items.find(
      behavior => behavior.PathPattern === "_next/data/*"
    ).LambdaFunctionAssociations.Items
  ];

  expect(allAssociations).toHaveLength(4);
  expect(
    allAssociations.every(
      item => item.LambdaFunctionARN === SANITIZED_ROLLBACK_ARN
    )
  ).toBe(true);
  expect(
    rolledBack.CacheBehaviors.Items.some(
      behavior => behavior.PathPattern === API_PATH
    )
  ).toBe(false);
  expect(SANITIZED_ROLLBACK_ARN).toBe(`${defaultBase}:153`);
  expect(SANITIZED_ROLLBACK_CODE_SHA256).toBe(
    "2hQ5vnW6lrjFC3nA0RAdI9OvBzQ2Pe1isxeZXpi2VwI="
  );
  expect(publishedVersionFromArn(SANITIZED_ROLLBACK_ARN)).toBe("153");
  expect(() => publishedVersionFromArn(`${defaultBase}:$LATEST`)).toThrow(
    "Invalid published Lambda@Edge ARN"
  );
});

test("production workflow is protected, OIDC-only, pinned, and never uses legacy deploy", () => {
  const workflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/production-deploy.yml"),
    "utf8"
  );
  const script = realFs.readFileSync(
    path.join(__dirname, "production-deploy.js"),
    "utf8"
  );
  const ciWorkflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/ci.yml"),
    "utf8"
  );

  expect(workflow).toContain("name: production");
  expect(workflow).toContain(
    'test "$(git rev-parse origin/master)" = "$DEPLOY_SHA"'
  );
  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain("role/hecmedia-production-deploy");
  expect(workflow).toMatch(/actions\/checkout@[0-9a-f]{40}/);
  expect(workflow).toMatch(
    /aws-actions\/configure-aws-credentials@[0-9a-f]{40}/
  );
  expect(workflow).toContain(
    "browser-actions/setup-chrome@2e1d749697dd1612b833dba4a722266286fbefcd"
  );
  expect(workflow).toContain('chrome-version: "151.0.7922.76"');
  expect(workflow).toContain(
    ["BROWSER_BIN: $", "{{ steps.setup-chrome.outputs.chrome-path }}"].join("")
  );
  expect(workflow).toContain("node scripts/production-release-tag.js");
  expect(workflow).toContain(".production-release/browser-acceptance.json");
  const mediaPreflight = workflow.indexOf("  media-preflight:");
  const protectedEnvironment = workflow.indexOf("      name: production");
  expect(mediaPreflight).toBeGreaterThan(-1);
  expect(workflow).toContain("needs: [authorize, media-preflight]");
  expect(workflow).toContain('HECMEDIA_E2E_MEDIA_ASSETS: "true"');
  expect(workflow).toContain("tests/e2e/graphql/media-assets.e2e.test.js");
  expect(script).toContain('"/posts/hec-on-youtube"');
  expect(protectedEnvironment).toBeGreaterThan(mediaPreflight);
  const browserPreflight = workflow.indexOf(
    "Verify Chrome before production credentials"
  );
  const awsCredentials = workflow.indexOf(
    "aws-actions/configure-aws-credentials@"
  );
  expect(browserPreflight).toBeGreaterThan(-1);
  expect(awsCredentials).toBeGreaterThan(browserPreflight);
  expect(workflow).not.toContain("AWS_ACCESS_KEY_ID");
  expect(workflow).not.toContain("AWS_SECRET_ACCESS_KEY");
  expect(workflow).not.toContain("yarn deploy");
  expect(workflow).not.toContain("serverless");
  expect(ciWorkflow).not.toContain("AWS_ACCESS_KEY_ID");
  expect(ciWorkflow).not.toContain("AWS_SECRET_ACCESS_KEY");
  expect(ciWorkflow).not.toContain("yarn deploy");
  expect(script).not.toContain(`${defaultBase}:146`);

  const deployStart = script.indexOf("function deploy()");
  const guard = script.indexOf(
    'assertGovernedDeployContext(process.env, "deploy")',
    deployStart
  );
  const firstMutation = script.indexOf('"put-bucket-versioning"', deployStart);
  expect(guard).toBeGreaterThan(deployStart);
  expect(firstMutation).toBeGreaterThan(guard);
});
