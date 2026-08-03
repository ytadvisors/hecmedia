import {
  DEFAULT_RAIL_PROMO,
  getFallbackTopbarCtas,
  modernWpGraphqlEnabled,
  topbarCtasFromHeaderActionsMenu
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
    expect(getFallbackTopbarCtas()).toEqual([
      { label: "Subscribe", url: "/newsletter", style: "primary" },
      { label: "Support", url: "/support", style: "secondary" }
    ]);
    getFallbackTopbarCtas().forEach(cta => {
      expect(cta.url.startsWith("/")).toBe(true);
      expect(cta.url.startsWith("//")).toBe(false);
    });
    expect(DEFAULT_RAIL_PROMO.image.sourceUrl).toBe(
      "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/3ca97ec68430409a-For-Educators.jpg"
    );
  });

  it("maps HEADER_ACTIONS menu items to topbar CTA rows with path and style", () => {
    const ctas = topbarCtasFromHeaderActionsMenu({
      edges: [
        {
          node: {
            label: "Subscribe",
            path: "/newsletter",
            url: "https://staging-wp.hectv.org/newsletter",
            cssClasses: ["primary"],
            parentDatabaseId: 0
          }
        },
        {
          node: {
            label: "Support",
            path: "/donate",
            url: "https://staging-wp.hectv.org/donate",
            cssClasses: ["secondary"],
            parentDatabaseId: 0
          }
        },
        {
          node: {
            label: "Child",
            path: "/ignored",
            cssClasses: [],
            parentDatabaseId: 99
          }
        }
      ]
    });

    expect(ctas).toEqual([
      { label: "Subscribe", url: "/newsletter", style: "primary" },
      { label: "Support", url: "/donate", style: "secondary" }
    ]);
  });

  it("returns an empty list when the Header Actions menu is missing", () => {
    expect(topbarCtasFromHeaderActionsMenu(undefined)).toEqual([]);
    expect(topbarCtasFromHeaderActionsMenu({ edges: [] })).toEqual([]);
  });
});
