/**
 * Read-only contracts for the modern HEC-owned content controls.
 *
 * The public staging origin intentionally blocks the retired
 * /wp-json/hectv/v1/site-options endpoint. Runtime presentation settings now
 * come from hectvSiteContent, while Trending Now uses its trendingPostIds and
 * the standard newest-post fallback.
 */

const fetch = require("isomorphic-unfetch");
const { GRAPHQL_URI } = require("../support/config");

const describeModernCms =
  process.env.HECMEDIA_E2E_MODERN_WPGRAPHQL === "true"
    ? describe
    : describe.skip;

async function gql(query) {
  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`GraphQL → HTTP ${res.status}`);
  return res.json();
}

describeModernCms("GraphQL: hectvSiteContent", () => {
  it("returns the presentation settings used by the current layout", async () => {
    const result = await gql(`{
      hectvSiteContent {
        forEducators { imageUrl destinationUrl }
        trendingPostIds
        spotlightTitle
        footerLinks { label url }
        mobileRailFirst
      }
    }`);

    expect(result.errors).toBeUndefined();
    const content = result.data.hectvSiteContent;
    expect(content).toMatchObject({
      forEducators: {
        imageUrl: expect.any(String),
        destinationUrl: expect.any(String)
      },
      spotlightTitle: expect.any(String),
      footerLinks: expect.any(Array)
    });
    expect(content.forEducators.imageUrl).not.toBe("");
    expect(content.forEducators.destinationUrl).not.toBe("");
    expect(Array.isArray(content.trendingPostIds)).toBe(true);
    content.trendingPostIds.forEach(id => expect(typeof id).toBe("number"));
  });
});

describeModernCms("GraphQL: topbarCtas", () => {
  it("returns CTA objects with the current header shape", async () => {
    const result = await gql(`{ topbarCtas { label url style } }`);

    expect(result.errors).toBeUndefined();
    const { topbarCtas } = result.data;
    expect(Array.isArray(topbarCtas)).toBe(true);
    topbarCtas.forEach(cta => {
      expect(typeof cta.label).toBe("string");
      expect(typeof cta.url).toBe("string");
      expect(["primary", "secondary", "tertiary"]).toContain(cta.style);
    });
  });
});

describeModernCms("GraphQL: Post.headerImageSize", () => {
  it("returns the supported display size for real staging posts", async () => {
    const result = await gql(`{
      posts(first: 5) {
        nodes { slug headerImageSize }
      }
    }`);

    expect(result.errors).toBeUndefined();
    const { nodes } = result.data.posts;
    expect(nodes.length).toBeGreaterThan(0);
    nodes.forEach(post => {
      expect(typeof post.slug).toBe("string");
      expect(["small", "medium", "large", "full"]).toContain(
        post.headerImageSize
      );
    });
  });
});
