jest.mock("child_process", () => ({ execFileSync: jest.fn() }));
jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  rmSync: jest.fn()
}));

const { execFileSync } = require("child_process");
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
