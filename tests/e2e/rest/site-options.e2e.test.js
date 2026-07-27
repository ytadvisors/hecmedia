/**
 * E2E tests for the hectv-site-options mu-plugin (Gate 0 / task #82688).
 *
 * Covers all four fields over both the REST and WPGraphQL surfaces:
 *   - hectv_rail_promo        → REST railPromo + GraphQL hectvSiteOptions.railPromo
 *   - hectv_featured_videos   → REST featuredVideoIds + GraphQL featuredVideos (root)
 *   - hectv_topbar_ctas       → REST topbarCtas + GraphQL topbarCtas (root)
 *   - hectv_header_image_size → REST post meta + GraphQL Post.headerImageSize
 *
 * GraphQL schema registered by hectv-site-options.php:
 *   hectvSiteOptions { railPromo { image { id sourceUrl altText } url alt } }
 *   topbarCtas { label url style }       ← RootQuery field
 *   featuredVideos { id title ... }      ← RootQuery field, returns Post[]
 *   Post.headerImageSize                 ← per-post string field
 *
 * Requires local Docker WP at http://localhost:8091 with seed.sh already run.
 *
 * Run: GATSBY_WP_HOST=http://localhost:8091 APOLLO_CLIENT_URI=http://localhost:8091/graphql \
 *        yarn test:e2e -- tests/e2e/rest/site-options.e2e.test.js
 */

const fetch = require("isomorphic-unfetch");
const { REST_HOST, GRAPHQL_URI } = require("../support/config");

if (process.env.HECMEDIA_E2E_MODERN_WPGRAPHQL !== "true") {
  // These editor-managed fields belong to the modern CMS rollout. The
  // frontend's legacy compatibility path is covered by unit and acceptance
  // tests until that independently deployed schema is enabled.
  describe.skip("modern WordPress site options", () => {
    it("is gated by HECMEDIA_E2E_MODERN_WPGRAPHQL", () => {});
  });
}

const describeModernCms =
  process.env.HECMEDIA_E2E_MODERN_WPGRAPHQL === "true"
    ? describe
    : describe.skip;

async function restGet(path) {
  const res = await fetch(`${REST_HOST}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

async function gql(query) {
  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`GraphQL → HTTP ${res.status}`);
  return res.json();
}

// ── REST ─────────────────────────────────────────────────────────────────────

describeModernCms("REST: GET /wp-json/hectv/v1/site-options", () => {
  let siteOptions;

  beforeAll(async () => {
    siteOptions = await restGet("/wp-json/hectv/v1/site-options");
  });

  it("returns the three top-level keys", () => {
    expect(siteOptions).toHaveProperty("railPromo");
    expect(siteOptions).toHaveProperty("featuredVideoIds");
    expect(siteOptions).toHaveProperty("topbarCtas");
  });

  describe("railPromo (feature b)", () => {
    it("is null or an object with image { id, sourceUrl, altText }, url, alt", () => {
      const { railPromo } = siteOptions;
      if (railPromo !== null) {
        expect(railPromo).toHaveProperty("image");
        expect(railPromo.image).toMatchObject({
          id: expect.any(Number),
          sourceUrl: expect.any(String),
          altText: expect.any(String)
        });
        expect(railPromo.image.id).toBeGreaterThan(0);
        expect(typeof railPromo.url).toBe("string");
        expect(typeof railPromo.alt).toBe("string");
      }
    });

    it("is seeded with a fixture value", () => {
      expect(siteOptions.railPromo).not.toBeNull();
    });

    it("uses a real image attachment with a usable source URL", () => {
      expect(siteOptions.railPromo.image.sourceUrl).not.toBe("");
    });
  });

  describe("featuredVideoIds (feature c)", () => {
    it("is an array of integers", () => {
      const { featuredVideoIds } = siteOptions;
      expect(Array.isArray(featuredVideoIds)).toBe(true);
      featuredVideoIds.forEach(id => expect(typeof id).toBe("number"));
    });

    it("contains no more than 12 entries", () => {
      expect(siteOptions.featuredVideoIds.length).toBeLessThanOrEqual(12);
    });

    it("is seeded with at least one ID", () => {
      expect(siteOptions.featuredVideoIds.length).toBeGreaterThan(0);
    });
  });

  describe("topbarCtas (feature g)", () => {
    it("is an array with valid CTA shape", () => {
      const { topbarCtas } = siteOptions;
      expect(Array.isArray(topbarCtas)).toBe(true);
      topbarCtas.forEach(cta => {
        expect(typeof cta.label).toBe("string");
        expect(cta.label.length).toBeGreaterThan(0);
        expect(typeof cta.url).toBe("string");
        expect(["primary", "secondary", "tertiary"]).toContain(cta.style);
      });
    });

    it("contains no more than 5 entries", () => {
      expect(siteOptions.topbarCtas.length).toBeLessThanOrEqual(5);
    });

    it("is seeded with at least one CTA", () => {
      expect(siteOptions.topbarCtas.length).toBeGreaterThan(0);
    });
  });
});

describeModernCms("REST: post meta hectv_header_image_size (feature f)", () => {
  it("header-image-size-large fixture has meta value 'large'", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-large&_fields=id,slug,meta"
    );
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].meta.hectv_header_image_size).toBe("large");
  });

  it("header-image-size-small fixture has meta value 'small'", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-small&_fields=id,slug,meta"
    );
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].meta.hectv_header_image_size).toBe("small");
  });

  it("header-image-size-full fixture has meta value 'full'", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-full&_fields=id,slug,meta"
    );
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].meta.hectv_header_image_size).toBe("full");
  });

  it("header-image-size-default fixture has empty or 'full' meta (proves default)", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?slug=header-image-size-default&_fields=id,slug,meta"
    );
    expect(posts.length).toBeGreaterThan(0);
    // Default fixture intentionally has no stored meta value.
    expect(["", "full"]).toContain(posts[0].meta.hectv_header_image_size);
  });

  it("meta key hectv_header_image_size is present on all posts (register_post_meta)", async () => {
    const posts = await restGet(
      "/wp-json/wp/v2/posts?per_page=5&_fields=id,slug,meta"
    );
    expect(Array.isArray(posts)).toBe(true);
    posts.forEach(post => {
      expect(
        Object.prototype.hasOwnProperty.call(
          post.meta,
          "hectv_header_image_size"
        )
      ).toBe(true);
    });
  });
});

// ── GraphQL ───────────────────────────────────────────────────────────────────

describeModernCms("GraphQL: hectvSiteOptions.railPromo (feature b)", () => {
  it("returns railPromo.image { id sourceUrl altText }, url, alt with no errors", async () => {
    const result = await gql(`{
      hectvSiteOptions {
        railPromo {
          image { id sourceUrl altText }
          url
          alt
        }
      }
    }`);
    expect(result.errors).toBeUndefined();
    const { railPromo } = result.data.hectvSiteOptions;
    expect(railPromo).not.toBeNull();
    expect(railPromo.image.id).toBeGreaterThan(0);
    expect(typeof railPromo.url).toBe("string");
    expect(typeof railPromo.alt).toBe("string");
  });
});

describeModernCms("GraphQL: topbarCtas root field (feature g)", () => {
  it("returns CTA objects with label, url, style", async () => {
    const result = await gql(`{ topbarCtas { label url style } }`);
    expect(result.errors).toBeUndefined();
    const { topbarCtas } = result.data;
    expect(Array.isArray(topbarCtas)).toBe(true);
    expect(topbarCtas.length).toBeGreaterThan(0);
    topbarCtas.forEach(cta => {
      expect(typeof cta.label).toBe("string");
      expect(typeof cta.url).toBe("string");
      expect(["primary", "secondary", "tertiary"]).toContain(cta.style);
    });
  });
});

describeModernCms("GraphQL: featuredVideos root field (feature c)", () => {
  it("returns only posts that remain published after selection", async () => {
    const result = await gql(`{ featuredVideos { id title slug } }`);
    expect(result.errors).toBeUndefined();
    const { featuredVideos } = result.data;
    expect(Array.isArray(featuredVideos)).toBe(true);
    expect(featuredVideos.length).toBeGreaterThan(0);
    featuredVideos.forEach(post => {
      expect(typeof post.id).toBe("string"); // WPGraphQL global ID is base64
      expect(typeof post.title).toBe("string");
    });
    expect(featuredVideos.map(post => post.slug)).toContain(
      "featured-video-published"
    );
    expect(featuredVideos.map(post => post.slug)).not.toContain(
      "featured-video-withdrawn"
    );
    expect(featuredVideos.map(post => post.slug)).not.toContain(
      "featured-video-private"
    );
  });
});

describeModernCms("GraphQL: Post.headerImageSize (feature f)", () => {
  async function getHeaderImageSize(slug) {
    const result = await gql(`{
      posts(where: { name: "${slug}" }) {
        nodes { slug headerImageSize }
      }
    }`);
    expect(result.errors).toBeUndefined();
    const { nodes } = result.data.posts;
    expect(nodes.length).toBeGreaterThan(0);
    return nodes[0].headerImageSize;
  }

  it("header-image-size-large returns 'large'", async () => {
    expect(await getHeaderImageSize("header-image-size-large")).toBe("large");
  });

  it("header-image-size-small returns 'small'", async () => {
    expect(await getHeaderImageSize("header-image-size-small")).toBe("small");
  });

  it("header-image-size-full returns 'full'", async () => {
    expect(await getHeaderImageSize("header-image-size-full")).toBe("full");
  });

  it("header-image-size-default (no meta stored) returns 'full'", async () => {
    expect(await getHeaderImageSize("header-image-size-default")).toBe("full");
  });
});
