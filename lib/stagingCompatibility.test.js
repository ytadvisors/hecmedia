import {
  DEFAULT_RAIL_PROMO,
  getFallbackTopbarCtas,
  modernWpGraphqlEnabled
} from "./stagingCompatibility";

describe("legacy staging CMS compatibility", () => {
  const originalModern = process.env.HECMEDIA_MODERN_WPGRAPHQL;
  const originalCtas = process.env.HECMEDIA_TOPBAR_CTAS_JSON;

  afterEach(() => {
    if (originalModern === undefined) {
      delete process.env.HECMEDIA_MODERN_WPGRAPHQL;
    } else {
      process.env.HECMEDIA_MODERN_WPGRAPHQL = originalModern;
    }
    if (originalCtas === undefined) {
      delete process.env.HECMEDIA_TOPBAR_CTAS_JSON;
    } else {
      process.env.HECMEDIA_TOPBAR_CTAS_JSON = originalCtas;
    }
  });

  it("keeps modern queries on unless legacy compatibility is explicit", () => {
    delete process.env.HECMEDIA_MODERN_WPGRAPHQL;
    expect(modernWpGraphqlEnabled()).toBe(true);
    process.env.HECMEDIA_MODERN_WPGRAPHQL = "false";
    expect(modernWpGraphqlEnabled()).toBe(false);
  });

  it("uses configurable relative links for the header CTAs", () => {
    process.env.HECMEDIA_TOPBAR_CTAS_JSON = JSON.stringify([
      { label: "Join", url: "/join", style: "primary" },
      { label: "Unsafe", url: "https://example.com", style: "secondary" }
    ]);

    expect(getFallbackTopbarCtas()).toEqual([
      { label: "Join", url: "/join", style: "primary" }
    ]);
  });

  it("defaults to relative links and a CDN-served educator image", () => {
    delete process.env.HECMEDIA_TOPBAR_CTAS_JSON;
    getFallbackTopbarCtas().forEach(cta => {
      expect(cta.url.startsWith("/")).toBe(true);
      expect(cta.url.startsWith("//")).toBe(false);
    });
    expect(DEFAULT_RAIL_PROMO.image.sourceUrl).toBe(
      "/static/assets/for-educators-rail-promo.png"
    );
  });
});
