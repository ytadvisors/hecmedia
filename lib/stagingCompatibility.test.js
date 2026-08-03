import {
  DEFAULT_RAIL_PROMO,
  getFallbackTopbarCtas,
  mergeHecSiteChrome,
  modernWpGraphqlEnabled,
  normalizeForEducators,
  normalizeMaxVideos,
  railPromoFromSiteContent,
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

  it("keeps external HEADER_ACTIONS destinations absolute for external open", () => {
    const ctas = topbarCtasFromHeaderActionsMenu({
      edges: [
        {
          node: {
            label: "Partner",
            path: "https://example.org/partner",
            url: "https://example.org/partner",
            cssClasses: ["secondary"],
            parentDatabaseId: 0
          }
        },
        {
          node: {
            label: "Support HEC",
            path: "https://hecmedia.org/posts/support-hec",
            url: "https://hecmedia.org/posts/support-hec",
            cssClasses: ["primary"],
            parentDatabaseId: 0
          }
        }
      ]
    });

    expect(ctas).toEqual([
      {
        label: "Partner",
        url: "https://example.org/partner",
        style: "secondary"
      },
      {
        label: "Support HEC",
        url: "/posts/support-hec",
        style: "primary"
      }
    ]);
  });

  it("maps live Header Actions: Subscribe in-app, Support PayPal external", () => {
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
            path:
              "https://www.paypal.com/donate/?hosted_button_id=2ZRCZT5RZERRC",
            url:
              "https://www.paypal.com/donate/?hosted_button_id=2ZRCZT5RZERRC",
            cssClasses: ["secondary"],
            parentDatabaseId: 0
          }
        }
      ]
    });

    expect(ctas).toEqual([
      { label: "Subscribe", url: "/newsletter", style: "primary" },
      {
        label: "Support",
        url: "https://www.paypal.com/donate/?hosted_button_id=2ZRCZT5RZERRC",
        style: "secondary"
      }
    ]);
  });

  it("returns an empty list when the Header Actions menu is missing", () => {
    expect(topbarCtasFromHeaderActionsMenu(undefined)).toEqual([]);
    expect(topbarCtasFromHeaderActionsMenu({ edges: [] })).toEqual([]);
  });

  it("normalizes maxVideos from HEC Site Settings with a safe ceiling", () => {
    expect(normalizeMaxVideos({ maxVideos: 5 })).toBe(5);
    expect(normalizeMaxVideos(3)).toBe(3);
    expect(normalizeMaxVideos(0)).toBe(5);
    expect(normalizeMaxVideos(99)).toBe(20);
    expect(normalizeMaxVideos(undefined)).toBe(5);
  });

  it("maps canonical forEducators logo, url, and label for the rail", () => {
    expect(
      normalizeForEducators({
        label: "For Educators",
        url: "/spotlight",
        image: {
          sourceUrl: "https://cdn.example/edu.jpg",
          altText: ""
        }
      })
    ).toEqual({
      imageUrl: "https://cdn.example/edu.jpg",
      destinationUrl: "/spotlight",
      label: "For Educators"
    });
  });

  it("merges HEC Site Settings over legacy hectvSiteContent for the rail", () => {
    const chrome = mergeHecSiteChrome(
      {
        trendingSettings: { maxVideos: 5 },
        forEducators: {
          label: "For Educators",
          url: "/spotlight",
          image: { sourceUrl: "https://cdn.example/from-settings.jpg" }
        }
      },
      {
        forEducators: {
          imageUrl: "https://cdn.example/legacy.jpg",
          destinationUrl: "/category/education"
        },
        spotlightTitle: "Spotlight STL"
      }
    );

    expect(chrome.maxVideos).toBe(5);
    expect(chrome.forEducators).toEqual({
      imageUrl: "https://cdn.example/from-settings.jpg",
      destinationUrl: "/spotlight",
      label: "For Educators"
    });
    expect(railPromoFromSiteContent(chrome)).toEqual({
      image: {
        sourceUrl: "https://cdn.example/from-settings.jpg",
        altText: "For Educators"
      },
      url: "/spotlight",
      alt: "For Educators"
    });
  });

  it("keeps legacy For Educators fields when canonical settings are empty", () => {
    const chrome = mergeHecSiteChrome(
      {
        trendingSettings: { maxVideos: 7 },
        forEducators: { label: null, url: null, image: null }
      },
      {
        forEducators: {
          imageUrl: "https://cdn.example/legacy-edu.jpg",
          destinationUrl: "/category/education",
          label: "Legacy Educators"
        },
        spotlightTitle: "Spotlight STL"
      }
    );

    expect(chrome.maxVideos).toBe(7);
    expect(chrome.forEducators).toEqual({
      imageUrl: "https://cdn.example/legacy-edu.jpg",
      destinationUrl: "/category/education",
      label: "Legacy Educators"
    });
  });

  it("overlays only present canonical For Educators fields over legacy", () => {
    const chrome = mergeHecSiteChrome(
      {
        forEducators: {
          label: "Updated Educators",
          url: null,
          image: null
        }
      },
      {
        forEducators: {
          imageUrl: "https://cdn.example/legacy-edu.jpg",
          destinationUrl: "/category/education",
          label: "Legacy Educators"
        }
      }
    );

    expect(chrome.forEducators).toEqual({
      imageUrl: "https://cdn.example/legacy-edu.jpg",
      destinationUrl: "/category/education",
      label: "Updated Educators"
    });
  });
});
