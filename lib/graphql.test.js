import { print } from "graphql";
import {
  GET_HEADER_MENU,
  GET_LAYOUT,
  GET_PAGE_INFO,
  GET_POST_HEADER_IMAGE_SIZE
} from "./graphql";
import { getHeaderMenuObject } from "./getFunctions";

describe("GET_LAYOUT header navigation", () => {
  it("requests only root header items and obtains descendants from childItems", () => {
    const headerQuery = print(GET_HEADER_MENU);

    expect(headerQuery).toContain("menuItems(where: {parentDatabaseId: 0})");
    expect(headerQuery).toContain("childItems");
    expect(print(GET_LAYOUT)).not.toContain("parentDatabaseId");
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

describe("optional article header image metadata", () => {
  it("keeps the optional field isolated from the required article query", () => {
    expect(print(GET_PAGE_INFO)).not.toContain("headerImageSize");
    expect(print(GET_POST_HEADER_IMAGE_SIZE)).toContain("headerImageSize");
  });
});
