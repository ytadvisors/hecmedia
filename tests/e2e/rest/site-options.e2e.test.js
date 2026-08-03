/**
 * Read-only contracts for the modern HEC-owned content controls.
 *
 * Settings → HEC Site Settings is exposed as RootQuery.forEducators +
 * trendingSettings + trendingPosts. Legacy hectvSiteContent remains a fallback
 * for spotlight title / footer rail links.
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

describeModernCms("GraphQL: HEC Site Settings", () => {
  it("returns maxVideos and For Educators logo/url/label from site settings", async () => {
    const result = await gql(`{
      trendingSettings { maxVideos }
      forEducators {
        label
        url
        image { sourceUrl mediaItemUrl altText }
      }
      trendingPosts { title link databaseId }
    }`);

    expect(result.errors).toBeUndefined();
    expect(typeof result.data.trendingSettings.maxVideos).toBe("number");
    expect(result.data.trendingSettings.maxVideos).toBeGreaterThan(0);
    expect(result.data.forEducators.label).not.toBe("");
    expect(result.data.forEducators.url).not.toBe("");
    expect(
      result.data.forEducators.image.sourceUrl ||
        result.data.forEducators.image.mediaItemUrl
    ).toBeTruthy();
    expect(Array.isArray(result.data.trendingPosts)).toBe(true);
    expect(result.data.trendingPosts.length).toBeLessThanOrEqual(
      result.data.trendingSettings.maxVideos
    );
  });
});

describeModernCms("GraphQL: hectvSiteContent", () => {
  it("returns legacy presentation settings used as layout fallback", async () => {
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
