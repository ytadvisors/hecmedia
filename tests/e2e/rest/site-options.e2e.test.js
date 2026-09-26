/**
 * Read-only contracts for the modern HEC-owned content controls.
 *
 * Settings → HEC Site Settings is exposed as RootQuery.forEducators +
 * trendingSettings + trendingPosts + newsletterSettings. Legacy
 * hectvSiteContent remains a fallback for older presentation fields.
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
  it("returns rail and For Educators values from site settings", async () => {
    const result = await gql(`{
      trendingSettings {
        maxVideos
        trendingTitle
        spotlightTitle
        mobileDisplay
      }
      newsletterSettings { captchaEnabled }
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
    expect(result.data.trendingSettings.trendingTitle).not.toBe("");
    expect(result.data.trendingSettings.spotlightTitle).not.toBe("");
    expect(["content-menu", "menu-content"]).toContain(
      result.data.trendingSettings.mobileDisplay
    );
    expect(typeof result.data.newsletterSettings.captchaEnabled).toBe(
      "boolean"
    );
    expect(result.data.forEducators.label).not.toBe("");
    expect(result.data.forEducators.url).not.toBe("");
    // The promotion card is optional CMS content. When no image has been
    // selected, the frontend intentionally falls back to its static chrome.
    if (result.data.forEducators.image !== null) {
      expect(
        result.data.forEducators.image.sourceUrl ||
          result.data.forEducators.image.mediaItemUrl
      ).toBeTruthy();
    }
    expect(Array.isArray(result.data.trendingPosts)).toBe(true);
    expect(result.data.trendingPosts.length).toBeLessThanOrEqual(
      result.data.trendingSettings.maxVideos
    );
  });
});

describeModernCms("GraphQL: hectvSiteContent", () => {
  it("returns legacy presentation settings when that optional field exists", async () => {
    const result = await gql(`{
      hectvSiteContent {
        forEducators { imageUrl destinationUrl }
        trendingPostIds
        spotlightTitle
        footerLinks { label url }
        mobileRailFirst
      }
    }`);

    if (result.errors) {
      expect(
        result.errors.some(({ message }) =>
          message.includes('Cannot query field "hectvSiteContent"')
        )
      ).toBe(true);
      return;
    }
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
  it("returns the supported display size when that optional field exists", async () => {
    const result = await gql(`{
      posts(first: 5) {
        nodes { slug headerImageSize }
      }
    }`);

    if (result.errors) {
      expect(
        result.errors.some(({ message }) =>
          message.includes('Cannot query field "headerImageSize"')
        )
      ).toBe(true);
      return;
    }
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
