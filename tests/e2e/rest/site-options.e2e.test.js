/**
 * E2E tests for the hectv-site-options mu-plugin (Gate 0 / task #82688).
 *
 * Covers all four fields over both the REST and WPGraphQL surfaces:
 *   - hectv_rail_promo        → REST site-options + GraphQL hectvSiteOptions.railPromo
 *   - hectv_featured_videos   → REST site-options + GraphQL hectvSiteOptions.featuredVideoIds
 *   - hectv_topbar_ctas       → REST site-options + GraphQL hectvSiteOptions.topbarCtas
 *   - hectv_header_image_size → REST post meta + GraphQL Post.headerImageSize
 *
 * Requires the local Docker WP at http://localhost:8091 (tunnel via
 * `ssh -L 8091:localhost:8091 worker-mba`) with seed.sh already run.
 *
 * Run: GATSBY_WP_HOST=http://localhost:8091 APOLLO_CLIENT_URI=http://localhost:8091/graphql \
 *        yarn test:e2e -- tests/e2e/rest/site-options.e2e.test.js
 */

const fetch = require("isomorphic-unfetch");
const { REST_HOST, GRAPHQL_URI } = require("../support/config");

async function restGet(path) {
  const res = await fetch(`${REST_HOST}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} → HTTP ${res.status}`);
  }
  return res.json();
}

async function gql(query) {
  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    throw new Error(`GraphQL → HTTP ${res.status}`);
  }
  return res.json();
}

// ── REST ─────────────────────────────────────────────────────────────────────

describe("REST: GET /wp-json/hectv/v1/site-options", () => {
  let siteOptions;

  beforeAll(async () => {
    siteOptions = await restGet("/wp-json/hectv/v1/site-options");
  });

  it("returns HTTP 200 with the three top-level keys", () => {
    expect(siteOptions).toHaveProperty("railPromo");
    expect(siteOptions).toHaveProperty("featuredVideoIds");
    expect(siteOptions).toHaveProperty("topbarCtas");
  });

  describe("railPromo", () => {
    it("is null or a valid object with imageId, url, alt", () => {
      const { railPromo } = siteOptions;
      if (railPromo !== null) {
        expect(railPromo).toMatchObject({
          imageId: expect.any(Number),
          url: expect.any(String),
          alt: expect.any(String)
        });
        expect(railPromo.imageId).toBeGreaterThan(0);
        expect(railPromo.url.length).toBeGreaterThan(0);
      }
    });
  });

  describe("featuredVideoIds", () => {
    it("is an array of integers (possibly empty)", () => {
      const { featuredVideoIds } = siteOptions;
      expect(Array.isArray(featuredVideoIds)).toBe(true);
      featuredVideoIds.forEach(id => expect(typeof id).toBe("number"));
    });
    it("contains no more than 12 entries", () => {
      expect(siteOptions.featuredVideoIds.length).toBeLessThanOrEqual(12);
    });
  });

  describe("topbarCtas", () => {
    it("is an array (possibly empty)", () => {
      expect(Array.isArray(siteOptions.topbarCtas)).toBe(true);
    });
    it("contains no more than 5 entries", () => {
      expect(siteOptions.topbarCtas.length).toBeLessThanOrEqual(5);
    });
    it("every entry has label, url, and a valid style", () => {
      const validStyles = ["primary", "secondary", "tertiary"];
      siteOptions.topbarCtas.forEach(cta => {
        expect(typeof cta.label).toBe("string");
        expect(cta.label.length).toBeGreaterThan(0);
        expect(typeof cta.url).toBe("string");
        expect(cta.url.length).toBeGreaterThan(0);
        expect(validStyles).toContain(cta.style);
      });
    });
  });
});

describe("REST: POST meta hectv_header_image_size is exposed on posts", () => {
  it("GET /wp-json/wp/v2/posts includes meta.hectv_header_image_size on each post", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?per_page=5&_fields=id,slug,meta"
    );
    expect(Array.isArray(posts)).toBe(true);
    posts.forEach(post => {
      expect(post).toHaveProperty("meta");
      // The field must be present in meta (value may be '' for no-default posts).
      expect(
        Object.prototype.hasOwnProperty.call(
          post.meta,
          "hectv_header_image_size"
        )
      ).toBe(true);
    });
  });

  it("header-image-size-small fixture post has meta.hectv_header_image_size === 'small'", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-small&_fields=slug,meta"
    );
    if (posts.length === 0) {
      // Seed hasn't been run yet — fixture not present; skip gracefully.
      console.warn(
        "header-image-size-small fixture not found; run seed.sh first."
      );
      return;
    }
    expect(posts[0].meta.hectv_header_image_size).toBe("small");
  });

  it("header-image-size-default fixture post has empty meta (no explicit value)", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-default&_fields=slug,meta"
    );
    if (posts.length === 0) {
      console.warn(
        "header-image-size-default fixture not found; run seed.sh first."
      );
      return;
    }
    // Default fixture must have no stored value (empty string from register_post_meta default).
    expect(posts[0].meta.hectv_header_image_size).toBe("");
  });
});

// ── WPGraphQL ─────────────────────────────────────────────────────────────────

describe("WPGraphQL: hectvSiteOptions query", () => {
  let result;

  beforeAll(async () => {
    result = await gql(`{
      hectvSiteOptions {
        railPromo { imageId url alt }
        featuredVideoIds
        topbarCtas { label url style }
      }
    }`);
  });

  it("query returns no errors", () => {
    expect(result.errors).toBeUndefined();
  });

  it("hectvSiteOptions is present in the response", () => {
    expect(result.data).toHaveProperty("hectvSiteOptions");
  });

  it("railPromo is null or a valid object", () => {
    const { railPromo } = result.data.hectvSiteOptions;
    if (railPromo !== null) {
      expect(typeof railPromo.imageId).toBe("number");
      expect(typeof railPromo.url).toBe("string");
      expect(typeof railPromo.alt).toBe("string");
    }
  });

  it("featuredVideoIds is an array of integers", () => {
    const { featuredVideoIds } = result.data.hectvSiteOptions;
    expect(Array.isArray(featuredVideoIds)).toBe(true);
    featuredVideoIds.forEach(id => expect(typeof id).toBe("number"));
  });

  it("topbarCtas is an array with valid shape", () => {
    const { topbarCtas } = result.data.hectvSiteOptions;
    const validStyles = ["primary", "secondary", "tertiary"];
    expect(Array.isArray(topbarCtas)).toBe(true);
    topbarCtas.forEach(cta => {
      expect(typeof cta.label).toBe("string");
      expect(typeof cta.url).toBe("string");
      expect(validStyles).toContain(cta.style);
    });
  });
});

describe("WPGraphQL: Post.headerImageSize field", () => {
  it("resolves headerImageSize for a seeded post", async () => {
    // First get a real post ID from REST, then query GraphQL for its headerImageSize.
    const posts = await restGet("/wp-json/wp/v2/posts?per_page=1&_fields=id");
    if (!posts.length) {
      console.warn("No posts found; run seed.sh first.");
      return;
    }
    const postId = posts[0].id;
    const res = await gql(`{
      post(id: "${postId}", idType: DATABASE_ID) {
        databaseId
        headerImageSize
      }
    }`);
    expect(res.errors).toBeUndefined();
    expect(res.data.post).not.toBeNull();
    // headerImageSize is either a valid enum value or 'full' (the default).
    const validSizes = ["small", "medium", "large", "full"];
    expect(validSizes).toContain(res.data.post.headerImageSize);
  });

  it("resolves headerImageSize=small for the header-image-size-small fixture", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-small&_fields=id"
    );
    if (!posts.length) {
      console.warn(
        "header-image-size-small fixture not found; run seed.sh first."
      );
      return;
    }
    const postId = posts[0].id;
    const res = await gql(`{
      post(id: "${postId}", idType: DATABASE_ID) {
        headerImageSize
      }
    }`);
    expect(res.errors).toBeUndefined();
    expect(res.data.post.headerImageSize).toBe("small");
  });

  it("resolves headerImageSize=full for the header-image-size-default fixture (no meta stored)", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-default&_fields=id"
    );
    if (!posts.length) {
      console.warn(
        "header-image-size-default fixture not found; run seed.sh first."
      );
      return;
    }
    const postId = posts[0].id;
    const res = await gql(`{
      post(id: "${postId}", idType: DATABASE_ID) {
        headerImageSize
      }
    }`);
    expect(res.errors).toBeUndefined();
    // No meta → resolver must return 'full'.
    expect(res.data.post.headerImageSize).toBe("full");
  });
});
