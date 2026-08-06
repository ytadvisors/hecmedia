const path = require("path");

const realFs = jest.requireActual("fs");
const {
  API_PATH,
  SANITIZED_ROLLBACK_ARN,
  assertDistributionContract,
  assertFunctionContract,
  assertGovernedDeployContext,
  configureProductionDistribution,
  configureSanitizedRollback,
  requireBuildContract
} = require("./production-deploy");

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
    RE_CAPTCHA_SITE_KEY: `6L${"a".repeat(38)}`
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

test("rollback always restores sanitized version 147 and removes the API behavior", () => {
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
  expect(SANITIZED_ROLLBACK_ARN).toBe(`${defaultBase}:147`);
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
