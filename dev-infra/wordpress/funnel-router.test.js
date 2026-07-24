"use strict";

const { chooseOrigin, getOperationName } = require("./funnel-router");

const localOrigin = "http://local.test";
const upstreamOrigin = "https://upstream.test";

describe("HEC staging Funnel router", () => {
  test.each([
    "RailPromo",
    "TopbarCtas",
    "FeaturedVideos",
    "PostHeaderImageSize"
  ])("routes %s to local WordPress", operationName => {
    expect(
      chooseOrigin({
        pathname: "/graphql",
        body: { operationName, query: `query ${operationName} { __typename }` },
        localOrigin,
        upstreamOrigin
      })
    ).toBe(localOrigin);
  });

  test.each(["PageLayout", "NewestVideos", "HomePageInfo"])(
    "routes established operation %s to upstream WordPress",
    operationName => {
      expect(
        chooseOrigin({
          pathname: "/graphql",
          body: {
            operationName,
            query: `query ${operationName} { __typename }`
          },
          localOrigin,
          upstreamOrigin
        })
      ).toBe(upstreamOrigin);
    }
  );

  test("infers the operation name when operationName is omitted", () => {
    expect(
      getOperationName({
        query: "query RailPromo { hectvSiteOptions { railPromo { url } } }"
      })
    ).toBe("RailPromo");
  });

  test("routes the local site-options fixture and leaves other REST upstream", () => {
    expect(
      chooseOrigin({
        pathname: "/wp-json/hectv/v1/site-options",
        body: null,
        localOrigin,
        upstreamOrigin
      })
    ).toBe(localOrigin);
    expect(
      chooseOrigin({
        pathname: "/wp-json/wp/v2/posts",
        body: null,
        localOrigin,
        upstreamOrigin
      })
    ).toBe(upstreamOrigin);
  });
});
