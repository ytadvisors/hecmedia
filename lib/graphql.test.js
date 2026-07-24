import { print } from "graphql";
import { GET_LAYOUT } from "./graphql";

describe("GET_LAYOUT header navigation", () => {
  it("requests only root header items and obtains descendants from childItems", () => {
    const headerQuery = print(GET_LAYOUT).split("footer: menus")[0];

    expect(headerQuery).toContain("menuItems(where: {parentDatabaseId: 0})");
    expect(headerQuery).toContain("childItems");
  });
});
