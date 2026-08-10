const path = require("path");
const os = require("os");

const realFs = jest.requireActual("fs");
const {
  API_PATH,
  SANITIZED_ROLLBACK_ARN,
  SANITIZED_ROLLBACK_CODE_SHA256,
  applySanitizedRollback,
  assertBuiltGtmContract,
  assertDistributionContract,
  assertFunctionContract,
  assertGovernedDeployContext,
  assertHydratedImageSources,
  assertHydratedNavigation,
  assertHydratedSiteIdentity,
  assertRemoteImageResponse,
  configureProductionDistribution,
  configureSanitizedRollback,
  extractRemoteImageUrls,
  isApprovedRemoteImageUrl,
  parseJsonOutput,
  publishedVersionFromArn,
  requireBuildContract
} = require("./production-deploy");

const defaultBase =
  "arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd";
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
      ForwardedValues: { QueryString: true },
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
    HECMEDIA_EDGE_API: "false",
    HECMEDIA_NEWSLETTER_MODE: "omit",
    HECMEDIA_DISABLE_IMAGE_OPTIMIZER: "true",
    HECMEDIA_MODERN_WPGRAPHQL: "true",
    DEPLOY_SHA: "a".repeat(40),
    RE_CAPTCHA_SITE_KEY: "6Lf8RFAUAAAAAPArR_euM1R2KgaGujAOUAofjdZo",
    GA_TAGMANAGER_ID: "GTM-57RZPNN",
    EXPECTED_GTM_RESOURCE_VERSION: "21",
    EXPECTED_GTM_CANONICAL_SHA256: "c".repeat(64),
    EXPECTED_GTM_COUNTS: "22/34/31/18",
    EXPECTED_GTM_INVENTORY_SHA256: "d".repeat(64)
  };
}

function governedEnv(action = "deploy") {
  const env = {
    GITHUB_ACTIONS: "true",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_WORKFLOW_REF:
      "ytadvisors/hecmedia/.github/workflows/production-deploy.yml@refs/heads/master",
    GITHUB_ACTOR: "yt-agent-tom-gpt",
    GITHUB_RUN_ID: "31360000000",
    GITHUB_RUN_ATTEMPT: "1",
    HECMEDIA_PRODUCTION_REQUEST_TASK_ID: "86634",
    DEPLOY_SHA: "a".repeat(40),
    PRODUCTION_CONFIRMATION:
      action === "rollback"
        ? "ROLLBACK HEC FRONTEND PRODUCTION"
        : "DEPLOY HEC FRONTEND PRODUCTION"
  };
  if (action === "rollback") {
    env.SOURCE_DEPLOY_TASK_ID = "86633";
    env.SOURCE_DEPLOY_RUN_ID = "31350000000";
    env.SOURCE_DEPLOY_RUN_ATTEMPT = "2";
    env.SOURCE_DEPLOY_RELEASE_SHA = "b".repeat(40);
    env.SOURCE_DEPLOY_BASELINE_ETAG = "EBASELINE123";
    env.SOURCE_DEPLOY_BASELINE_RELEASE_SHA = "d".repeat(40);
    env.PREIMAGE_MANIFEST_KEY = `_deployment-evidence/${env.SOURCE_DEPLOY_TASK_ID}/${env.SOURCE_DEPLOY_RUN_ID}/${env.SOURCE_DEPLOY_RUN_ATTEMPT}/${env.SOURCE_DEPLOY_RELEASE_SHA}/s3-preimage-manifest.json`;
    env.PREIMAGE_MANIFEST_SHA256 = "c".repeat(64);
  }
  return env;
}

test("requires send-enabled general forms and an omitted newsletter API", () => {
  expect(() => requireBuildContract(buildEnv())).not.toThrow();
  expect(() =>
    requireBuildContract({ ...buildEnv(), HECMEDIA_NO_SEND_FORMS: "true" })
  ).toThrow("HECMEDIA_NO_SEND_FORMS must equal false");
  expect(() =>
    requireBuildContract({ ...buildEnv(), HECMEDIA_EDGE_API: "true" })
  ).toThrow("HECMEDIA_EDGE_API must equal false");
  expect(() =>
    requireBuildContract({ ...buildEnv(), HECMEDIA_NEWSLETTER_MODE: "active" })
  ).toThrow("HECMEDIA_NEWSLETTER_MODE must equal omit");
  expect(() =>
    requireBuildContract({
      ...buildEnv(),
      RE_CAPTCHA_SITE_KEY: `6L${"a".repeat(38)}`
    })
  ).toThrow("RE_CAPTCHA_SITE_KEY must equal");
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
  expect(() =>
    requireBuildContract({ ...buildEnv(), EXPECTED_GTM_RESOURCE_VERSION: "" })
  ).toThrow("EXPECTED_GTM_RESOURCE_VERSION");
  expect(() =>
    requireBuildContract({ ...buildEnv(), EXPECTED_GTM_CANONICAL_SHA256: "" })
  ).toThrow("EXPECTED_GTM_CANONICAL_SHA256");
  expect(() =>
    requireBuildContract({ ...buildEnv(), EXPECTED_GTM_COUNTS: "22,34,31,18" })
  ).toThrow("EXPECTED_GTM_COUNTS");
  expect(() =>
    requireBuildContract({ ...buildEnv(), EXPECTED_GTM_INVENTORY_SHA256: "" })
  ).toThrow("EXPECTED_GTM_INVENTORY_SHA256");
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

test("built artifacts contain only the approved GTM container and loader", () => {
  const directory = realFs.mkdtempSync(path.join(os.tmpdir(), "hec-gtm-"));
  try {
    realFs.writeFileSync(
      path.join(directory, "candidate.js"),
      "dataLayer;event:'gtm.js';www.googletagmanager.com/gtm.js?id=;GTM-57RZPNN"
    );
    expect(assertBuiltGtmContract([directory])).toMatchObject({
      container_id: "GTM-57RZPNN"
    });
    realFs.writeFileSync(
      path.join(directory, "wrong.js"),
      "www.googletagmanager.com/gtm.js?id=;GTM-WRONG"
    );
    expect(() => assertBuiltGtmContract([directory])).toThrow(
      "Built candidate GTM contract failed"
    );
  } finally {
    realFs.rmSync(directory, { force: true, recursive: true });
  }
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

test("hydrated identity is route-specific and rejects error documents", () => {
  expect(() =>
    assertHydratedSiteIdentity(
      '<title>HEC on YouTube</title><article data-media-verification="article-content">Video</article>',
      "/posts/hec-on-youtube"
    )
  ).not.toThrow();
  expect(() =>
    assertHydratedSiteIdentity(
      '<title>404</title><article data-media-verification="article-content">404 not found.</article>',
      "/posts/hec-on-youtube"
    )
  ).toThrow("invalid/error document");
  expect(() =>
    assertHydratedSiteIdentity("<title>HEC-TV | Home</title>HEC-TV", "/")
  ).not.toThrow();
  expect(() =>
    assertHydratedSiteIdentity(
      '<title>HEC-TV | Films</title><main data-media-verification="post-list">Films</main>',
      "/category/films"
    )
  ).not.toThrow();
  expect(() =>
    assertHydratedSiteIdentity(
      '<title>HEC-TV | Newsletter Signup</title><main class="newsletter-unavailable">Unavailable</main>',
      "/newsletter"
    )
  ).not.toThrow();
  expect(() =>
    assertHydratedSiteIdentity(
      "<title>HEC-TV | About Us</title><main>Wrong page</main>",
      "/newsletter"
    )
  ).toThrow("unexpected identity");
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
  const approvedImage =
    "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/story.jpg";
  expect(() =>
    assertRemoteImageResponse(approvedImage, "/", {
      status: 0,
      stdout: "206\timage/jpeg",
      stderr: ""
    })
  ).not.toThrow();
  expect(() =>
    assertRemoteImageResponse(approvedImage, "/", {
      status: 0,
      stdout: "200\ttext/html",
      stderr: ""
    })
  ).toThrow("returned non-image content type text/html");
  expect(() =>
    assertRemoteImageResponse(approvedImage, "/", {
      status: 22,
      stdout: "404\ttext/html",
      stderr: "curl: (22) The requested URL returned error: 404"
    })
  ).toThrow("has a broken image");
  expect(
    isApprovedRemoteImageUrl(
      "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/education.jpg"
    )
  ).toBe(true);
  expect(
    isApprovedRemoteImageUrl("https://analytics.example.com/pixel.gif")
  ).toBe(false);
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
  expect(() =>
    assertGovernedDeployContext(
      { ...governedEnv("rollback"), SOURCE_DEPLOY_RUN_ATTEMPT: "" },
      "rollback"
    )
  ).toThrow("original deploy run attempt");
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

test("atomically replaces four SSR associations and keeps the API absent", () => {
  const nextDefault = `${defaultBase}:149`;
  const configured = configureProductionDistribution(
    distribution(),
    baselineDefault,
    "none",
    nextDefault
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

  expect(
    configured.CacheBehaviors.Items.some(
      behavior => behavior.PathPattern === API_PATH
    )
  ).toBe(false);
});

test("refuses to reactivate or inherit a newsletter API behavior", () => {
  const withApi = distribution();
  withApi.CacheBehaviors.Items.push({ PathPattern: API_PATH });
  withApi.CacheBehaviors.Quantity = withApi.CacheBehaviors.Items.length;
  expect(() =>
    assertDistributionContract(withApi, baselineDefault, "none")
  ).toThrow("authorized baseline says none");
  expect(() =>
    configureProductionDistribution(
      distribution(),
      baselineDefault,
      "arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-api:6",
      `${defaultBase}:150`
    )
  ).toThrow("outside the approved GTM release path");
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

  const foreignAssociation = distribution();
  foreignAssociation.CacheBehaviors.Items[1].LambdaFunctionAssociations = {
    Items: [
      {
        EventType: "viewer-request",
        IncludeBody: false,
        LambdaFunctionARN:
          "arn:aws:lambda:us-east-1:850335719356:function:unexpected:1"
      }
    ],
    Quantity: 1
  };
  expect(() =>
    assertDistributionContract(foreignAssociation, baselineDefault)
  ).toThrow("exactly four owned");

  const wrongEventShape = distribution();
  wrongEventShape.DefaultCacheBehavior.LambdaFunctionAssociations.Items[0].EventType =
    "viewer-request";
  expect(() =>
    assertDistributionContract(wrongEventShape, baselineDefault)
  ).toThrow("association shape drifted");
});

test("rollback always restores sanitized version 150 and removes the API behavior", () => {
  const released = configureProductionDistribution(
    distribution(),
    baselineDefault,
    "none",
    `${defaultBase}:149`
  );
  released.CacheBehaviors.Items.push({ PathPattern: API_PATH });
  released.CacheBehaviors.Quantity = released.CacheBehaviors.Items.length;
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
  expect(SANITIZED_ROLLBACK_ARN).toBe(`${defaultBase}:150`);
  expect(SANITIZED_ROLLBACK_CODE_SHA256).toBe(
    "InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag="
  );
  expect(publishedVersionFromArn(SANITIZED_ROLLBACK_ARN)).toBe("150");
  expect(() => publishedVersionFromArn(`${defaultBase}:$LATEST`)).toThrow(
    "Invalid published Lambda@Edge ARN"
  );
});

test("rollback never invalidates or reports success after a partial S3 restore", () => {
  const invalidateCache = jest.fn();
  const partial = new Error("second collision failed");
  partial.restoreResult = {
    failures: [{ key: "BUILD_ID", message: "checksum mismatch" }],
    restored: [{ key: "_next/data/old.json" }]
  };
  expect(() =>
    applySanitizedRollback(
      { outcome: "failed" },
      {
        invalidateCache,
        persistState: jest.fn(),
        restoreDistribution: false,
        restoreS3: () => {
          throw partial;
        },
        s3Manifest: { schema: "test" }
      }
    )
  ).toThrow("Rollback had 1 failure");
  expect(invalidateCache).not.toHaveBeenCalled();
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
    "node scripts/production-browser-verifier.js --self-test"
  );
  expect(workflow).toContain(
    "node scripts/verify-gtm-resource.js pre-credential"
  );
  expect(workflow).toContain(
    "node scripts/production-release-tag.js preflight"
  );
  expect(workflow).toContain("node scripts/production-release-tag.js create");
  expect(workflow).toContain("node scripts/production-release-tag.js cleanup");
  expect(workflow).toContain("node scripts/production-deploy.js recover");
  expect(workflow).toContain("persist-credentials: false");
  expect(workflow).toContain("source_deploy_release_sha:");
  expect(workflow).toContain("source_deploy_run_attempt:");
  expect(workflow).toContain("source_deploy_baseline_release_sha:");
  expect(workflow).toContain("preimage_manifest_sha256:");
  expect(workflow).toContain("expected_gtm_inventory_sha256:");
  expect(workflow).toContain(
    ["BROWSER_BIN: $", "{{ steps.setup-chrome.outputs.chrome-path }}"].join("")
  );
  const mediaPreflight = workflow.indexOf("  media-preflight:");
  const protectedEnvironment = workflow.indexOf("      name: production");
  expect(mediaPreflight).toBeGreaterThan(-1);
  expect(workflow).toContain("needs: [authorize, media-preflight]");
  expect(workflow).toContain('HECMEDIA_E2E_MEDIA_ASSETS: "true"');
  expect(workflow).toContain("tests/e2e/graphql/media-assets.e2e.test.js");
  expect(script).toContain('"/posts/hec-on-youtube"');
  expect(protectedEnvironment).toBeGreaterThan(mediaPreflight);
  const browserPreflight = workflow.indexOf(
    "Prove the HTTP and WebSocket firewall and package its runtime"
  );
  const awsCredentials = workflow.indexOf(
    "aws-actions/configure-aws-credentials@"
  );
  expect(browserPreflight).toBeGreaterThan(-1);
  expect(awsCredentials).toBeGreaterThan(browserPreflight);
  const candidateJob = workflow.slice(
    workflow.indexOf("  candidate-build:"),
    workflow.indexOf("  deploy-or-rollback:")
  );
  expect(candidateJob).toContain("contents: read");
  expect(candidateJob).not.toContain("environment:");
  expect(candidateJob).not.toContain("secrets.");
  expect(candidateJob).not.toContain("id-token: write");
  expect(candidateJob).not.toContain("contents: write");
  expect(workflow).not.toContain("AWS_ACCESS_KEY_ID");
  expect(workflow).not.toContain("AWS_SECRET_ACCESS_KEY");
  expect(workflow).not.toContain("yarn deploy");
  expect(workflow).not.toContain("serverless deploy");
  expect(workflow).not.toContain("yarn serverless");
  expect(script).toContain('"--no-follow-symlinks"');
  expect(ciWorkflow).not.toContain("AWS_ACCESS_KEY_ID");
  expect(ciWorkflow).not.toContain("AWS_SECRET_ACCESS_KEY");
  expect(ciWorkflow).not.toContain("yarn deploy");
  expect(script).not.toContain(`${defaultBase}:146`);

  const deployStart = script.indexOf("function deploy()");
  const guard = script.indexOf(
    'assertGovernedDeployContext(process.env, "deploy")',
    deployStart
  );
  const preimages = script.indexOf("preparePreimages({", deployStart);
  const firstMutation = script.indexOf("syncAssets();", deployStart);
  expect(guard).toBeGreaterThan(deployStart);
  expect(preimages).toBeGreaterThan(guard);
  expect(firstMutation).toBeGreaterThan(guard);
  expect(firstMutation).toBeGreaterThan(preimages);
  expect(script).not.toContain('"put-bucket-versioning"');

  const preTagUpload = workflow.indexOf(
    "Upload verified pre-tag production evidence"
  );
  const releaseTag = workflow.indexOf(
    "Record immutable successful frontend release tag as the terminal release operation"
  );
  const emergencyRecovery = workflow.indexOf(
    "Recover the exact deploy attempt after any post-write failure"
  );
  expect(preTagUpload).toBeGreaterThan(awsCredentials);
  expect(releaseTag).toBeGreaterThan(preTagUpload);
  expect(emergencyRecovery).toBeGreaterThan(releaseTag);
});
