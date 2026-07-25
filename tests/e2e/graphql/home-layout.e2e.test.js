import moment from "moment";
import {
  GET_HOME_PAGE,
  GET_LAYOUT,
  GET_HEADER_MENU,
  GET_SCHEDULE,
  GET_PAGE_TEMPLATE
} from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

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
  it("returns header/footer/social menus and featured content shaped for the shell", async () => {
    const result = await executeQuery(GET_LAYOUT, undefined);

    expect(result.errors).toBeUndefined();
    const { featuredMagazines, spotLight, footer, social } = result.data;

    expect(Array.isArray(featuredMagazines.edges)).toBe(true);
    expect(Array.isArray(spotLight.nodes)).toBe(true);

    [footer, social].forEach(menu => {
      expect(Array.isArray(menu.edges)).toBe(true);
      menu.edges.forEach(({ node }) => {
        expect(Array.isArray(node.menuItems.edges)).toBe(true);
        node.menuItems.edges.forEach(({ node: item }) => {
          expect(typeof item.label).toBe("string");
          expect(typeof item.url === "string" || item.url === null).toBe(true);
          expect(Array.isArray(item.childItems.edges)).toBe(true);
        });
      });
    });
  });
});

describe("HeaderMenu (containers/Layout/index.js)", () => {
  it("returns the nested header menu from the staging WordPress contract", async () => {
    const result = await executeQuery(GET_HEADER_MENU, undefined);

    expect(result.errors).toBeUndefined();
    const { header } = result.data;
    expect(Array.isArray(header.edges)).toBe(true);
    header.edges.forEach(({ node }) => {
      expect(Array.isArray(node.menuItems.edges)).toBe(true);
      node.menuItems.edges.forEach(({ node: item }) => {
        expect(typeof item.label).toBe("string");
        expect(typeof item.parentDatabaseId).toBe("number");
        expect(Array.isArray(item.childItems.edges)).toBe(true);
      });
    });
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
