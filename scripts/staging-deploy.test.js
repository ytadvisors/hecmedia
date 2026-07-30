jest.mock("child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  existsSync: jest.fn(),
  rmSync: jest.fn(),
  renameSync: jest.fn()
}));
jest.mock("@sls-next/lambda-at-edge", () => ({
  Builder: jest.fn().mockImplementation(() => ({ build: jest.fn() }))
}));

const { execFileSync } = require("child_process");
const path = require("path");

const realFs = jest.requireActual("fs");

const fs = require("fs");
const {
  build,
  discardEmptyApiLambdaBundle,
  discardUnusedImageLambdaBundle,
  configurePublicHtmlCache,
  sourceUsesNextImage,
  syncAssets,
  updateCloudFront
} = require("./staging-deploy");

const lambdaArn =
  "arn:aws:lambda:us-east-1:123456789012:function:mf64oua-5ao6wt";
const distributionConfig = {
  DefaultCacheBehavior: {
    AllowedMethods: {
      CachedMethods: { Items: ["HEAD", "GET"] }
    },
    MinTTL: 0,
    DefaultTTL: 0,
    MaxTTL: 31536000,
    LambdaFunctionAssociations: {
      Items: [
        { EventType: "origin-request", LambdaFunctionARN: `${lambdaArn}:3` }
      ]
    }
  }
};

test("configures a one-minute public HTML edge cache", () => {
  const config = {
    DefaultCacheBehavior: {
      AllowedMethods: {
        CachedMethods: { Items: ["HEAD", "GET"] }
      },
      MinTTL: 9,
      DefaultTTL: 0,
      MaxTTL: 0
    }
  };

  expect(configurePublicHtmlCache(config)).toMatchObject({
    MinTTL: 0,
    DefaultTTL: 60,
    MaxTTL: 60
  });
});

test("refuses to change a distribution that cannot cache GET and HEAD", () => {
  expect(() =>
    configurePublicHtmlCache({
      DefaultCacheBehavior: {
        AllowedMethods: { CachedMethods: { Items: ["GET"] } }
      }
    })
  ).toThrow("does not cache both GET and HEAD");
});

beforeEach(() => {
  execFileSync.mockReset();
  fs.existsSync.mockReset();
  fs.readFileSync.mockReset();
  fs.readdirSync.mockReset();
  fs.renameSync.mockReset();
  fs.rmSync.mockReset();
});

function mockApiBundle(manifest, compiledEntries = []) {
  fs.existsSync.mockImplementation(
    file =>
      file.endsWith("api-lambda") ||
      file.endsWith("api-lambda/manifest.json") ||
      file.endsWith("api-lambda/pages/api")
  );
  fs.readFileSync.mockReturnValue(JSON.stringify(manifest));
  fs.readdirSync.mockReturnValue(compiledEntries);
}

test("discards a generated API bundle only when its manifest and pages are empty", () => {
  mockApiBundle({ apis: { dynamic: {}, nonDynamic: {} } });

  discardEmptyApiLambdaBundle();

  expect(fs.rmSync).toHaveBeenCalledWith(expect.stringMatching(/api-lambda$/), {
    recursive: true,
    force: false
  });
});

test("discards a manifest-less API bundle only when the directory is file-empty", () => {
  fs.existsSync.mockImplementation(file => file.endsWith("api-lambda"));
  fs.readdirSync.mockReturnValue([]);

  discardEmptyApiLambdaBundle();

  expect(fs.readFileSync).not.toHaveBeenCalled();
  expect(fs.rmSync).toHaveBeenCalledWith(expect.stringMatching(/api-lambda$/), {
    recursive: true,
    force: false
  });
});

test("rejects files in a manifest-less API bundle", () => {
  fs.existsSync.mockImplementation(file => file.endsWith("api-lambda"));
  fs.readdirSync.mockReturnValue([
    { name: "unexpected.js", isFile: () => true, isDirectory: () => false }
  ]);

  expect(() => discardEmptyApiLambdaBundle()).toThrow(
    "no manifest but contains files"
  );
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test.each([
  [{ apis: { dynamic: { "/api/[id]": {} }, nonDynamic: {} } }, "/api/[id]"],
  [
    { apis: { dynamic: {}, nonDynamic: { "/api/newsletter": {} } } },
    "/api/newsletter"
  ]
])("rejects a generated API bundle containing routes", (manifest, route) => {
  mockApiBundle(manifest);

  expect(() => discardEmptyApiLambdaBundle()).toThrow(route);
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("rejects a malformed API manifest", () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue("not-json");

  expect(() => discardEmptyApiLambdaBundle()).toThrow("manifest is invalid");
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("rejects compiled API files even when the manifest claims no routes", () => {
  mockApiBundle({ apis: { dynamic: {}, nonDynamic: {} } }, [
    { name: "newsletter.js", isFile: () => true, isDirectory: () => false }
  ]);

  expect(() => discardEmptyApiLambdaBundle()).toThrow("compiled API files");
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("discards the generated image bundle only for an explicitly disabled, unused optimizer", () => {
  const original = process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = "true";
  fs.existsSync.mockImplementation(file => file.endsWith("image-lambda"));
  fs.readdirSync.mockReturnValue([]);

  try {
    discardUnusedImageLambdaBundle();
  } finally {
    if (original === undefined)
      delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
    else process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = original;
  }

  expect(fs.rmSync).toHaveBeenCalledWith(
    expect.stringMatching(/image-lambda$/),
    { recursive: true, force: false }
  );
});

test("rejects a generated image bundle unless the staging optimizer flag is set", () => {
  const original = process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
  fs.existsSync.mockImplementation(file => file.endsWith("image-lambda"));

  try {
    expect(() => discardUnusedImageLambdaBundle()).toThrow(
      "HECMEDIA_DISABLE_IMAGE_OPTIMIZER is not true"
    );
  } finally {
    if (original === undefined)
      delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;
    else process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = original;
  }
  expect(fs.rmSync).not.toHaveBeenCalled();
});

test("detects next/image imports before discarding an image bundle", () => {
  fs.readdirSync.mockReturnValueOnce([
    { name: "page.js", isFile: () => true, isDirectory: () => false }
  ]);
  fs.readFileSync.mockReturnValue('import Image from "next/image";');

  expect(sourceUsesNextImage("/repo")).toBe(true);
});

test("omits API routes only for a no-send staging build and restores them", async () => {
  const originalNoSend = process.env.HECMEDIA_NO_SEND_FORMS;
  process.env.HECMEDIA_NO_SEND_FORMS = "true";
  fs.existsSync.mockImplementation(file => {
    if (file.endsWith("pages/api")) return true;
    if (file.endsWith(".staging-disabled-pages-api")) return false;
    if (file.endsWith("default-lambda") || file.endsWith("assets")) return true;
    return false;
  });

  try {
    await build();
  } finally {
    if (originalNoSend === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = originalNoSend;
  }

  expect(fs.renameSync.mock.calls).toEqual([
    [
      expect.stringMatching(/pages\/api$/),
      expect.stringMatching(/\.staging-disabled-pages-api$/)
    ],
    [
      expect.stringMatching(/\.staging-disabled-pages-api$/),
      expect.stringMatching(/pages\/api$/)
    ]
  ]);
});

test("syncAssets preserves prior immutable assets during a release", () => {
  syncAssets();

  expect(execFileSync).toHaveBeenCalledWith(
    "aws",
    expect.arrayContaining(["s3", "sync", "--region", "us-east-1"]),
    expect.objectContaining({ encoding: "utf8" })
  );
  expect(execFileSync.mock.calls[0][1]).not.toContain("--delete");
});

test("waits for CloudFront propagation before invalidating updated associations", () => {
  execFileSync
    .mockReturnValueOnce(
      JSON.stringify({ ETag: "etag", DistributionConfig: distributionConfig })
    )
    .mockReturnValueOnce("")
    .mockReturnValueOnce("")
    .mockReturnValueOnce("I123456789\n")
    .mockReturnValueOnce("");

  expect(updateCloudFront("E1ARETO6518UT4", lambdaArn, "4")).toBe(1);

  const awsCalls = execFileSync.mock.calls.map(([, args]) => args);
  const updateIndex = awsCalls.findIndex(
    args => args[1] === "update-distribution"
  );
  const distributionWaitIndex = awsCalls.findIndex(
    args => args[1] === "wait" && args[2] === "distribution-deployed"
  );
  const invalidateIndex = awsCalls.findIndex(
    args => args[1] === "create-invalidation"
  );
  const invalidationWaitIndex = awsCalls.findIndex(
    args => args[1] === "wait" && args[2] === "invalidation-completed"
  );

  expect(awsCalls[distributionWaitIndex]).toEqual([
    "cloudfront",
    "wait",
    "distribution-deployed",
    "--id",
    "E1ARETO6518UT4"
  ]);
  expect(awsCalls[invalidationWaitIndex]).toEqual([
    "cloudfront",
    "wait",
    "invalidation-completed",
    "--distribution-id",
    "E1ARETO6518UT4",
    "--id",
    "I123456789"
  ]);
  expect(updateIndex).toBeLessThan(distributionWaitIndex);
  expect(distributionWaitIndex).toBeLessThan(invalidateIndex);
  expect(invalidateIndex).toBeLessThan(invalidationWaitIndex);
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringMatching(/cloudfront-config\.json$/),
    expect.stringContaining('"DefaultTTL":60')
  );
});

test("uses build-time SSR config and never checks a Lambda runtime environment", () => {
  const repoRoot = path.join(__dirname, "..");
  const workflow = realFs.readFileSync(
    path.join(repoRoot, ".github/workflows/staging-deploy.yml"),
    "utf8"
  );
  const deployScript = realFs.readFileSync(
    path.join(__dirname, "staging-deploy.js"),
    "utf8"
  );

  expect(workflow).toMatch(
    /Package Next\.js app for Lambda@Edge[\s\S]*?APOLLO_CLIENT_URI: \$\{\{ secrets\.HECMEDIA_STAGING_APOLLO_CLIENT_URI \}\}[\s\S]*?WP_HOST: \$\{\{ secrets\.HECMEDIA_STAGING_WP_HOST \}\}/
  );
  expect(deployScript).not.toContain("checkLambdaEnvironment");
  expect(deployScript).not.toContain("get-function-configuration");
});

test("packages staging on Node 24 with the webpack 4 OpenSSL compatibility flag", () => {
  const workflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/staging-deploy.yml"),
    "utf8"
  );

  expect(workflow).toMatch(/actions\/setup-node@v4[\s\S]*?node-version: "24"/);
  expect(workflow).toMatch(
    /Package Next\.js app for Lambda@Edge[\s\S]*?NODE_OPTIONS: --openssl-legacy-provider/
  );
});

test("supports read-only runtime inspection without entering deployment", () => {
  const workflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/staging-deploy.yml"),
    "utf8"
  );

  expect(workflow).toMatch(/options: \[inspect, deploy, rollback\]/);
  expect(workflow).toMatch(
    /deploy-and-verify:[\s\S]*?if: inputs\.action != 'inspect'/
  );
  expect(workflow).toMatch(
    /inspect-runtime:[\s\S]*?if: inputs\.action == 'inspect'[\s\S]*?get-function-configuration/
  );
});

test("allows only Yomi or governed Jerome lanes and requires a task receipt", () => {
  const workflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/staging-deploy.yml"),
    "utf8"
  );

  expect(workflow).toMatch(
    /authorize:[\s\S]*?DISPATCH_ACTOR: \$\{\{ github\.actor \}\}[\s\S]*?ytwguru\|yt-agent-tom\|yt-agent-tom-gpt\|yt-agent-tom-grok/
  );
  expect(workflow).toMatch(
    /REQUEST_TASK_ID: \$\{\{ inputs\.request_task_id \}\}/
  );
  expect(workflow).toMatch(/\^\[1-9\]\[0-9\]\*\$/);
  expect(workflow).toMatch(/deploy-and-verify:[\s\S]*?needs: authorize/);
  expect(workflow).toMatch(/"request_task_id":"%s","dispatch_actor":"%s"/);
});
