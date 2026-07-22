jest.mock("child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  rmSync: jest.fn()
}));

const { execFileSync } = require("child_process");
const path = require("path");

const realFs = jest.requireActual("fs");

const { syncAssets, updateCloudFront } = require("./staging-deploy");

const lambdaArn =
  "arn:aws:lambda:us-east-1:123456789012:function:mf64oua-5ao6wt";
const distributionConfig = {
  DefaultCacheBehavior: {
    LambdaFunctionAssociations: {
      Items: [
        { EventType: "origin-request", LambdaFunctionARN: `${lambdaArn}:3` }
      ]
    }
  }
};

beforeEach(() => {
  execFileSync.mockReset();
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
  execFileSync.mockReturnValueOnce(
    JSON.stringify({ ETag: "etag", DistributionConfig: distributionConfig })
  );

  expect(updateCloudFront("E1ARETO6518UT4", lambdaArn, "4")).toBe(1);

  const awsCalls = execFileSync.mock.calls.map(([, args]) => args);
  const updateIndex = awsCalls.findIndex(
    args => args[1] === "update-distribution"
  );
  const waitIndex = awsCalls.findIndex(args => args[1] === "wait");
  const invalidateIndex = awsCalls.findIndex(
    args => args[1] === "create-invalidation"
  );

  expect(awsCalls[waitIndex]).toEqual([
    "cloudfront",
    "wait",
    "distribution-deployed",
    "--id",
    "E1ARETO6518UT4"
  ]);
  expect(updateIndex).toBeLessThan(waitIndex);
  expect(waitIndex).toBeLessThan(invalidateIndex);
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

test("requires Yomi to authorize every staging workflow dispatch", () => {
  const workflow = realFs.readFileSync(
    path.join(__dirname, "../.github/workflows/staging-deploy.yml"),
    "utf8"
  );

  expect(workflow).toMatch(
    /authorize:[\s\S]*?DISPATCH_ACTOR: \$\{\{ github\.actor \}\}[\s\S]*?"ytwguru"[\s\S]*?exit 1/
  );
  expect(workflow).toMatch(/deploy-and-verify:[\s\S]*?needs: authorize/);
});
