import { print } from "graphql";
import {
  GET_ALL_MAGAZINES,
  GET_CATEGORY_INFO,
  GET_HEADER_ACTIONS_MENU,
  GET_HEADER_MENU,
  GET_HEC_SITE_SETTINGS,
  GET_HECTV_SITE_CONTENT,
  GET_LEGACY_HEADER_MENU,
  GET_HOME_PAGE,
  GET_LAYOUT,
  GET_MAGAZINE_INFO,
  GET_NEWEST_VIDEOS,
  GET_PAGE_INFO,
  GET_POST_HEADER_IMAGE_SIZE,
  GET_TOPBAR_CTAS
} from "./graphql";
import { getHeaderMenuObject } from "./getFunctions";

describe("modern WPGraphQL post filters", () => {
  it("keeps the home-page operation on native category connections", () => {
    const homeQuery = print(GET_HOME_PAGE);

    expect(homeQuery).toContain("categories {");
    expect(homeQuery).not.toContain("shouldOutputInFlatList");
  });

  it("uses native category filters instead of the failing tax-query resolver", () => {
    const layoutQuery = print(GET_LAYOUT);
    const categoryQuery = print(GET_CATEGORY_INFO);

    expect(layoutQuery).toContain('categoryName: "spotlight"');
    expect(categoryQuery).toContain("categoryName: $category");
    expect(layoutQuery).not.toContain("taxQuery");
    expect(categoryQuery).not.toContain("taxQuery");
  });

  it("keeps the failing legacy header resolver out of the shell operation", () => {
    expect(print(GET_LAYOUT)).not.toContain("header: menus");
  });
});

describe("magazine collections", () => {
  it("keeps featured magazines on the site shell; events stay retired", () => {
    const query = print(GET_LAYOUT);

    expect(query).toContain("featuredMagazines: magazines");
    expect(query).not.toContain("events(");
    expect(query).not.toContain("eventCategories");
  });

  it("keeps related events out of article queries", () => {
    const query = print(GET_PAGE_INFO);

    expect(query).not.toContain("postEvents");
    expect(query).not.toContain("relatedEvent");
  });

  it("exposes magazine list and detail operations", () => {
    expect(print(GET_ALL_MAGAZINES)).toContain("magazineData: magazines");
    expect(print(GET_MAGAZINE_INFO)).toContain("magazine: magazineBy");
  });
});

describe("GET_LAYOUT header navigation", () => {
  it("uses the modern root menuItems connection and obtains descendants", () => {
    const headerQuery = print(GET_HEADER_MENU);

    expect(headerQuery).toContain(
      "header: menuItems(first: 100, where: {location: PRIMARY})"
    );
    expect(headerQuery).toContain("parentDatabaseId");
    expect(headerQuery).toContain("childItems");
    expect(print(GET_LAYOUT)).not.toContain("header: menus");
  });

  it("retains an isolated legacy menu operation when modern mode is disabled", () => {
    const legacyHeaderQuery = print(GET_LEGACY_HEADER_MENU);

    expect(legacyHeaderQuery).toContain(
      'header: menus(where: {slug: "header"})'
    );
    expect(legacyHeaderQuery).toContain("menuItems");
    expect(legacyHeaderQuery).toContain("childItems");
  });

  it("loads Subscribe/Support from the HEADER_ACTIONS menu location", () => {
    const query = print(GET_HEADER_ACTIONS_MENU);

    expect(query).toContain("location: HEADER_ACTIONS");
    expect(query).toContain("headerActions: menuItems");
    expect(query).toContain("cssClasses");
    expect(query).toContain("path");
    expect(print(GET_TOPBAR_CTAS)).toContain("topbarCtas");
    expect(print(GET_LAYOUT)).not.toContain("HEADER_ACTIONS");
  });

  it("loads HEC Site Settings for maxVideos and For Educators chrome", () => {
    const query = print(GET_HEC_SITE_SETTINGS);

    expect(query).toContain("trendingSettings");
    expect(query).toContain("maxVideos");
    expect(query).toContain("forEducators");
    expect(query).toContain("trendingPosts");
    expect(query).toContain("sourceUrl");
    expect(query).toContain("label");
    expect(print(GET_HECTV_SITE_CONTENT)).toContain("mobileRailFirst");
    expect(print(GET_NEWEST_VIDEOS)).toContain("$first");
    expect(print(GET_LAYOUT)).not.toContain("trendingSettings");
  });

  it("keeps a flat WPGraphQL menu response from duplicating descendants at the root", () => {
    const leadership = {
      node: {
        label: "Leadership",
        url: "https://hectv.org/about/leadership",
        parentDatabaseId: 22
      }
    };
    const organization = {
      node: {
        label: "Our Organization",
        url: "https://hectv.org/about/organization",
        parentDatabaseId: 11,
        childItems: { edges: [leadership] }
      }
    };
    const about = {
      node: {
        label: "About",
        url: "https://hectv.org/about",
        parentDatabaseId: 0,
        childItems: { edges: [organization] }
      }
    };

    const menu = getHeaderMenuObject([about, organization, leadership]);

    expect(menu.map(item => item.label)).toEqual(["About"]);
    expect(menu[0].children.map(item => item.label)).toEqual([
      "Our Organization"
    ]);
    expect(menu[0].children[0].children.map(item => item.label)).toEqual([
      "Leadership"
    ]);
  });

  it("rewrites staging-wp absolute menu URLs to site-relative paths", () => {
    const arts = {
      node: {
        label: "Arts",
        url: "https://staging-wp.hectv.org/category/arts/",
        path: "/category/arts/",
        parentDatabaseId: 0,
        childItems: { edges: [] }
      }
    };
    const menu = getHeaderMenuObject([arts]);
    expect(menu).toHaveLength(1);
    expect(menu[0].url).toBe("/category/arts/");
  });
});

describe("GET_NEWEST_VIDEOS modern media connection", () => {
  it("requests MediaItem through featuredImage.node", () => {
    const query = print(GET_NEWEST_VIDEOS);

    expect(query).toMatch(/featuredImage\s*\{\s*node\s*\{\s*sourceUrl/);
    expect(query).toMatch(/postDetails\s*\{\s*videoImage/);
  });
});

describe("optional article header image metadata", () => {
  it("keeps the optional field isolated from the required article query", () => {
    expect(print(GET_PAGE_INFO)).not.toContain("headerImageSize");
    expect(print(GET_POST_HEADER_IMAGE_SIZE)).toContain("headerImageSize");
  });
});

describe("GET_PAGE_INFO postHero", () => {
  it("requests postHero for the main post page only", () => {
    const query = print(GET_PAGE_INFO);
    expect(query).toMatch(/postHero\s*\{/);
    expect(query).toMatch(/postHeader\s*\{/);
  });
});
