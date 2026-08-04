const {
  apiBehavior,
  configureDistribution,
  publishedFunctionArn,
  staticBehavior
} = require("./newsletter-production-deploy");

const defaultBehavior = {
  TargetOriginId: "x2l4ew-k0m7umi",
  ViewerProtocolPolicy: "redirect-to-https",
  AllowedMethods: {
    Quantity: 2,
    Items: ["HEAD", "GET"],
    CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
  },
  SmoothStreaming: false,
  Compress: true,
  LambdaFunctionAssociations: {
    Quantity: 1,
    Items: [
      {
        LambdaFunctionARN: "arn:aws:lambda:us-east-1:123:function:legacy:1",
        EventType: "origin-request",
        IncludeBody: true
      }
    ]
  },
  FieldLevelEncryptionId: "",
  ForwardedValues: {
    QueryString: true,
    Cookies: { Forward: "all" },
    Headers: { Quantity: 0 },
    QueryStringCacheKeys: { Quantity: 0 }
  },
  MinTTL: 0,
  DefaultTTL: 0,
  MaxTTL: 31536000
};

const versionedArn =
  "arn:aws:lambda:us-east-1:850335719356:function:hecmedia-newsletter-api-edge:3";

test("uses AWS's already-versioned Lambda ARN exactly once", () => {
  expect(
    publishedFunctionArn({ FunctionArn: versionedArn, Version: "3" })
  ).toBe(versionedArn);
  expect(() =>
    publishedFunctionArn({ FunctionArn: `${versionedArn}:3`, Version: "3" })
  ).toThrow("invalid Lambda@Edge function ARN");
});

test("static newsletter behaviors never inherit the legacy SSR Lambda", () => {
  const behavior = staticBehavior(defaultBehavior, "newsletter/*");

  expect(behavior.PathPattern).toBe("newsletter/*");
  expect(behavior.LambdaFunctionAssociations).toEqual({ Quantity: 0 });
  expect(behavior.AllowedMethods.Items).toEqual(["HEAD", "GET"]);
  expect(behavior.DefaultTTL).toBe(60);
  expect(defaultBehavior.LambdaFunctionAssociations.Quantity).toBe(1);
});

test("the API behavior accepts request bodies but caches nothing", () => {
  const behavior = apiBehavior(defaultBehavior, versionedArn);

  expect(behavior.PathPattern).toBe("api/newsletter/subscribe");
  expect(behavior.AllowedMethods.Items).toContain("POST");
  expect(behavior.DefaultTTL).toBe(0);
  expect(behavior.MaxTTL).toBe(0);
  expect(behavior.LambdaFunctionAssociations.Items).toEqual([
    {
      LambdaFunctionARN: versionedArn,
      EventType: "origin-request",
      IncludeBody: true
    }
  ]);
});

test("configuration replaces only the three owned behaviors", () => {
  const config = {
    DefaultCacheBehavior: defaultBehavior,
    CacheBehaviors: {
      Quantity: 3,
      Items: [
        { ...defaultBehavior, PathPattern: "_next/static/*" },
        { ...defaultBehavior, PathPattern: "newsletter" },
        { ...defaultBehavior, PathPattern: "api/newsletter/subscribe" }
      ]
    }
  };

  const updated = configureDistribution(config, versionedArn);

  expect(updated.CacheBehaviors.Quantity).toBe(4);
  expect(updated.CacheBehaviors.Items.map(item => item.PathPattern)).toEqual([
    "api/newsletter/subscribe",
    "newsletter",
    "newsletter/*",
    "_next/static/*"
  ]);
  expect(config.CacheBehaviors.Quantity).toBe(3);
});

test("configuration fails closed for the wrong distribution or unversioned Lambda", () => {
  expect(() =>
    configureDistribution(
      { DefaultCacheBehavior: { TargetOriginId: "wrong" } },
      versionedArn
    )
  ).toThrow("origin contract changed");
  expect(() =>
    configureDistribution(
      { DefaultCacheBehavior: defaultBehavior },
      versionedArn.replace(/:3$/, "")
    )
  ).toThrow("published, versioned");
});
