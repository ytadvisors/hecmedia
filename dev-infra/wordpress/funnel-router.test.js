const http = require("http");
const {
  chooseOrigin,
  createRouter,
  getOperationName,
  isMutation
} = require("./funnel-router");

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

  test("routes anonymous feature reads locally but preserves named legacy queries", () => {
    expect(
      chooseOrigin({
        pathname: "/graphql",
        body: { query: "{ topbarCtas { label } }" },
        localOrigin,
        upstreamOrigin
      })
    ).toBe(localOrigin);
    expect(
      chooseOrigin({
        pathname: "/graphql",
        body: {
          query:
            "query PageLayout { featuredVideos { id } topbarCtas { label } }"
        },
        localOrigin,
        upstreamOrigin
      })
    ).toBe(upstreamOrigin);
  });

  test("detects GraphQL mutations conservatively", () => {
    expect(
      isMutation({ query: "mutation UpdatePost { updatePost { id } }" })
    ).toBe(true);
    expect(
      isMutation({ query: "query PageLayout { generalSettings { url } }" })
    ).toBe(false);
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

  test("routes REST post-meta fixture reads locally", () => {
    expect(
      chooseOrigin({
        pathname: "/wp-json/wp/v2/posts",
        searchParams: new URLSearchParams(
          "slug=header-image-size-large&_fields=id,slug,meta"
        ),
        localOrigin,
        upstreamOrigin
      })
    ).toBe(localOrigin);
    expect(
      chooseOrigin({
        pathname: "/wp-json/wp/v2/posts",
        searchParams: new URLSearchParams("per_page=1&_fields=id,slug"),
        localOrigin,
        upstreamOrigin
      })
    ).toBe(upstreamOrigin);
  });

  test.each([
    {
      name: "REST POST",
      request: { method: "POST", path: "/wp-json/wp/v2/posts", body: "{}" }
    },
    {
      name: "GraphQL mutation",
      request: {
        method: "POST",
        path: "/graphql",
        body: JSON.stringify({
          query: "mutation UpdatePost { updatePost { id } }"
        }),
        contentType: "application/json"
      }
    }
  ])("rejects $name before any upstream request", async ({ request }) => {
    let upstreamRequests = 0;
    const upstream = http.createServer((req, res) => {
      upstreamRequests += 1;
      res.end("{}");
    });
    await new Promise(resolve => upstream.listen(0, "127.0.0.1", resolve));
    const upstreamPort = upstream.address().port;
    const router = createRouter({
      localOrigin,
      upstreamOrigin: `http://127.0.0.1:${upstreamPort}`
    });
    await new Promise(resolve => router.listen(0, "127.0.0.1", resolve));
    const routerPort = router.address().port;

    const statusCode = await new Promise((resolve, reject) => {
      const outbound = http.request(
        {
          hostname: "127.0.0.1",
          port: routerPort,
          path: request.path,
          method: request.method,
          headers: {
            "content-type": request.contentType || "application/json",
            "content-length": Buffer.byteLength(request.body)
          }
        },
        response => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        }
      );
      outbound.on("error", reject);
      outbound.end(request.body);
    });

    await new Promise(resolve => router.close(resolve));
    await new Promise(resolve => upstream.close(resolve));
    expect(statusCode).toBe(405);
    expect(upstreamRequests).toBe(0);
  });
});
