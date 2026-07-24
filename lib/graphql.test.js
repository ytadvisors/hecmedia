import { print } from "graphql";
import { GET_LAYOUT } from "./graphql";
import { getHeaderMenuObject } from "./getFunctions";

describe("GET_LAYOUT header navigation", () => {
  it("requests only root header items and obtains descendants from childItems", () => {
    const headerQuery = print(GET_LAYOUT).split("footer: menus")[0];

    expect(headerQuery).toContain("menuItems(where: {parentDatabaseId: 0})");
    expect(headerQuery).toContain("childItems");
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
