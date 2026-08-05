import moment from "moment";
import {
  GET_HOME_PAGE,
  GET_LAYOUT,
  GET_FOOTER_MENU,
  GET_SOCIAL_MENU,
  GET_HEADER_MENU,
  GET_HEADER_ACTIONS_MENU,
  GET_HEC_SITE_SETTINGS,
  GET_HEC_SITE_PRESENTATION,
  GET_NEWEST_VIDEOS,
  GET_NEWSLETTER_SETTINGS,
  GET_SCHEDULE,
  GET_PAGE_TEMPLATE
} from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

const describeModernCms =
  process.env.HECMEDIA_E2E_MODERN_WPGRAPHQL === "true"
    ? describe
    : describe.skip;

/**
 * Contract tests for the queries wired into containers/Layout/index.js and
 * pages/[page].js — every field asserted here is a field one of those
 * consumers destructures. Shape only: this is a live external WP backend, so
 * we assert types/structure, never exact titles/counts (see TESTING.md#e2e).
 * Optional custom fields are queried separately so their rollout cannot
 * invalidate this site-shell operation.
 */
describe("HomePageInfo (pages/index.js)", () => {
  it("returns pageData + postData shaped for the home page", async () => {
    const result = await executeQuery(GET_HOME_PAGE, { uri: "home" });

    expect(result.errors).toBeUndefined();
    const { pageData, postData } = result.data;

    if (pageData !== null) {
      expect(typeof pageData.title).toBe("string");
      expect(typeof pageData.link).toBe("string");
      if (pageData.feedDesign !== null) {
        expect(Array.isArray(pageData.feedDesign.newRowLayout)).toBe(true);
      }
    }

    expect(Array.isArray(postData.edges)).toBe(true);
    postData.edges.forEach(({ node }) => {
      expect(typeof node.title).toBe("string");
      expect(typeof node.postId).toBe("number");
      expect(typeof node.slug).toBe("string");
      expect(typeof node.link).toBe("string");
      expect(Array.isArray(node.categories.edges)).toBe(true);
    });
  });
});

describe("PageLayout (containers/Layout/index.js)", () => {
  it("returns footer/social menus and featured content shaped for the shell", async () => {
    const [layoutResult, footerResult, socialResult] = await Promise.all([
      executeQuery(GET_LAYOUT, undefined),
      executeQuery(GET_FOOTER_MENU, undefined),
      executeQuery(GET_SOCIAL_MENU, undefined)
    ]);

    expect(layoutResult.errors).toBeUndefined();
    expect(footerResult.errors).toBeUndefined();
    expect(socialResult.errors).toBeUndefined();
    const { spotLight } = layoutResult.data;
    const { footer } = footerResult.data;
    const { social } = socialResult.data;

    expect(Array.isArray(spotLight.nodes)).toBe(true);

    expect(Array.isArray(footer.edges)).toBe(true);
    footer.edges.forEach(({ node }) => {
      expect(Array.isArray(node.menuItems.edges)).toBe(true);
      node.menuItems.edges.forEach(({ node: item }) => {
        expect(typeof item.label).toBe("string");
        expect(typeof item.url === "string" || item.url === null).toBe(true);
        expect(Array.isArray(item.childItems.edges)).toBe(true);
      });
    });

    expect(Array.isArray(social.edges)).toBe(true);
    social.edges.forEach(({ node }) => {
      expect(Array.isArray(node.menuItems.edges)).toBe(true);
      node.menuItems.edges.forEach(({ node: item }) => {
        expect(typeof item.label).toBe("string");
        expect(typeof item.url === "string" || item.url === null).toBe(true);
      });
    });
  });
});

describeModernCms("HeaderMenu (containers/Layout/index.js)", () => {
  it("returns the nested header menu from the staging WordPress contract", async () => {
    const result = await executeQuery(GET_HEADER_MENU, undefined);

    expect(result.errors).toBeUndefined();
    const { header } = result.data;
    expect(Array.isArray(header.edges)).toBe(true);
    expect(header.edges.length).toBeGreaterThan(0);
    header.edges.forEach(({ node: item }) => {
      expect(typeof item.label).toBe("string");
      expect(typeof item.parentDatabaseId).toBe("number");
      expect(Array.isArray(item.childItems.edges)).toBe(true);
    });
  });

  it("returns Header Actions (Subscribe/Support) for the top-bar CTAs", async () => {
    const result = await executeQuery(GET_HEADER_ACTIONS_MENU, undefined);

    expect(result.errors).toBeUndefined();
    const { headerActions } = result.data;
    expect(Array.isArray(headerActions.edges)).toBe(true);
    expect(headerActions.edges.length).toBeGreaterThan(0);
    headerActions.edges.forEach(({ node: item }) => {
      expect(typeof item.label).toBe("string");
      expect(
        typeof item.path === "string" || typeof item.url === "string"
      ).toBe(true);
    });
    const labels = headerActions.edges.map(({ node }) =>
      String(node.label).toLowerCase()
    );
    expect(labels.some(l => l.includes("subscribe"))).toBe(true);
    expect(labels.some(l => l.includes("support"))).toBe(true);
  });

  it("returns HEC Site Settings for maxVideos and For Educators chrome", async () => {
    const result = await executeQuery(GET_HEC_SITE_SETTINGS, undefined);

    expect(result.errors).toBeUndefined();
    const { trendingSettings, forEducators, trendingPosts } = result.data;
    expect(typeof trendingSettings.maxVideos).toBe("number");
    expect(trendingSettings.maxVideos).toBeGreaterThan(0);
    expect(typeof forEducators.label).toBe("string");
    expect(typeof forEducators.url).toBe("string");
    expect(forEducators.image).toBeTruthy();
    expect(
      typeof forEducators.image.sourceUrl === "string" ||
        typeof forEducators.image.mediaItemUrl === "string"
    ).toBe(true);
    expect(Array.isArray(trendingPosts)).toBe(true);
    expect(trendingPosts.length).toBeLessThanOrEqual(
      trendingSettings.maxVideos
    );
  });

  it("returns isolated rail headings and mobile display presentation", async () => {
    const result = await executeQuery(GET_HEC_SITE_PRESENTATION, undefined);

    expect(result.errors).toBeUndefined();
    const { trendingSettings } = result.data;
    expect(typeof trendingSettings.trendingTitle).toBe("string");
    expect(typeof trendingSettings.spotlightTitle).toBe("string");
    expect(["content-menu", "menu-content"]).toContain(
      trendingSettings.mobileDisplay
    );
  });

  it("returns the newsletter CAPTCHA control from HEC Site Settings", async () => {
    const result = await executeQuery(GET_NEWSLETTER_SETTINGS, undefined);

    expect(result.errors).toBeUndefined();
    expect(typeof result.data.newsletterSettings.captchaEnabled).toBe(
      "boolean"
    );
  });
});

describe("Layout video feeds (containers/Layout/index.js)", () => {
  it("returns the newest-video fallback from the staging WordPress schema", async () => {
    const result = await executeQuery(GET_NEWEST_VIDEOS, undefined);

    expect(result.errors).toBeUndefined();
    expect(Array.isArray(result.data.newestVideos.nodes)).toBe(true);
  });
});

describe("ScheduleLayout (containers/Layout/index.js)", () => {
  it("returns a nullable schedule for the current month, shaped for the program viewer", async () => {
    const currentMonth = moment()
      .format("MMMM-YYYY")
      .toLowerCase();
    const result = await executeQuery(GET_SCHEDULE, { currentMonth });

    // Layout.js queries this expecting it can error/be absent for months with
    // no schedule entry yet — assert shape only when data is present.
    if (!result.errors) {
      const { programs } = result.data;
      if (programs !== null) {
        const { schedulePrograms } = programs.scheduleDetails || {};
        expect(Array.isArray(schedulePrograms)).toBe(true);
        schedulePrograms.forEach(p => {
          expect(typeof p.programTitle).toBe("string");
        });
      }
    }
  });
});

describe("PageTemplate (pages/[page].js)", () => {
  it("returns a generic content page shaped for the page template renderer", async () => {
    const result = await executeQuery(GET_PAGE_TEMPLATE, { uri: "about-us" });

    expect(result.errors).toBeUndefined();
    const { pageInfo } = result.data;

    if (pageInfo !== null) {
      expect(typeof pageInfo.title).toBe("string");
      expect(typeof pageInfo.link).toBe("string");
      expect(
        pageInfo.pageTemplate === null ||
          typeof pageInfo.pageTemplate === "string"
      ).toBe(true);
    }
  });
});
