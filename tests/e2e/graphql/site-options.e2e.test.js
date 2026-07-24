import { GET_HECTV_SITE_OPTIONS } from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

// hectv-site-options mu-plugin (task #82688, MOCK-GAP-SPEC.md §4 Gate 0).
describe("hectv-site-options (dev-infra/wordpress/mu-plugins/hectv-site-options.php)", () => {
  it("resolves railPromo (b), topbarCtas (g), and featuredVideos (c) over WPGraphQL", async () => {
    const result = await executeQuery(GET_HECTV_SITE_OPTIONS);

    expect(result.errors).toBeUndefined();
    const { hectvSiteOptions, topbarCtas, featuredVideos } = result.data;

    expect(Array.isArray(topbarCtas)).toBe(true);
    topbarCtas.forEach(cta => {
      expect(typeof cta.label).toBe("string");
      expect(typeof cta.url).toBe("string");
      expect(["primary", "secondary", "tertiary"]).toContain(cta.style);
    });

    expect(Array.isArray(featuredVideos)).toBe(true);
    featuredVideos.forEach(post => {
      expect(typeof post.id).toBe("string");
      expect(typeof post.slug).toBe("string");
    });

    if (hectvSiteOptions.railPromo !== null) {
      expect(typeof hectvSiteOptions.railPromo.image.sourceUrl).toBe("string");
      expect(typeof hectvSiteOptions.railPromo.url).toBe("string");
    }
  });
});
