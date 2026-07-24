import SiteOptionsApi from "../../../store/api/SiteOptionsApi";
import PostApi from "../../../store/api/PostApi";
import { REST_HOST } from "../support/config";

const api = new SiteOptionsApi({ url: REST_HOST });
const postApi = new PostApi({ url: REST_HOST });

// hectv-site-options mu-plugin (task #82688, MOCK-GAP-SPEC.md §4 Gate 0).
// GET is public/read-safe; this suite never calls updateSiteOptions() against
// a real target — see tests/e2e/support/writeGuard.js.
describe("SiteOptionsApi (store/api/SiteOptionsApi.js)", () => {
  it("getSiteOptions returns the (b) rail promo, (c) featured video ids, and (g) topbar CTAs", async () => {
    const res = await api.getSiteOptions();
    expect(res.status).toBe(200);

    expect(Array.isArray(res.data.featuredVideoIds)).toBe(true);
    res.data.featuredVideoIds.forEach(id => expect(typeof id).toBe("number"));

    expect(Array.isArray(res.data.topbarCtas)).toBe(true);
    res.data.topbarCtas.forEach(cta => {
      expect(typeof cta.label).toBe("string");
      expect(typeof cta.url).toBe("string");
      expect(["primary", "secondary", "tertiary"]).toContain(cta.style);
    });

    if (res.data.railPromo !== null) {
      expect(typeof res.data.railPromo.image.id).toBe("number");
      expect(typeof res.data.railPromo.image.sourceUrl).toBe("string");
      expect(typeof res.data.railPromo.url).toBe("string");
    }
  });

  it("(f) header-image-size acceptance fixture posts expose meta.hectv_header_image_size", async () => {
    const res = await postApi.getPostBySlug("header-image-size-large");
    expect(res.status).toBe(200);
    if (res.data.length === 0) return; // seed.sh may not have run yet locally, see TESTING.md#e2e

    expect(res.data[0].meta.hectv_header_image_size).toBe("large");
  });
});
