import { print } from "graphql";
import {
  GET_CATEGORY_INFO,
  GET_HEADER_MENU,
  GET_LEGACY_HEADER_MENU,
  GET_HOME_PAGE,
  GET_LAYOUT,
  GET_NEWEST_VIDEOS,
  GET_PAGE_INFO,
  GET_POST_HEADER_IMAGE_SIZE
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
