import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import CategoryNav, {
  getCategoryUri,
  normalizeCategoryLink
} from "./CategoryNav";
import {
  GET_CATEGORY_NAV_CHILDREN,
  GET_CATEGORY_NAV_NODE
} from "../../lib/graphql";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("next/link", () => {
  const ReactModule = require("react");
  return ({ as, children, href }) =>
    ReactModule.cloneElement(ReactModule.Children.only(children), {
      href: as || href
    });
});

describe("CategoryNav", () => {
  const child = {
    name: "Music",
    link: "https://prod-wp.hectv.org/category/arts/music/"
  };
  const parent = {
    databaseId: 3,
    name: "Arts",
    link: "https://prod-wp.hectv.org/category/arts/"
  };

  beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockImplementation(document => {
      if (document === GET_CATEGORY_NAV_NODE) {
        return { data: { category: parent } };
      }
      if (document === GET_CATEGORY_NAV_CHILDREN) {
        return { data: { categories: { nodes: [child] } } };
      }
      throw new Error("Unexpected query");
    });
  });

  it("normalizes legacy, WordPress, and public category hosts to one route", () => {
    expect(normalizeCategoryLink("https://hectv.org/category/arts/")).toBe(
      "/category/arts"
    );
    expect(
      normalizeCategoryLink("https://prod-wp.hectv.org/category/arts")
    ).toBe("/category/arts");
    expect(normalizeCategoryLink("https://hecmedia.org/category/arts/")).toBe(
      "/category/arts"
    );
    expect(getCategoryUri("https://hecmedia.org/category/arts")).toBe(
      "/category/arts/"
    );
    expect(getCategoryUri("/category/arts/?source=menu#genres")).toBe(
      "/category/arts/"
    );
  });

  it("loads subgenres with the parent-filtered taxonomy connection", () => {
    render(<CategoryNav link="https://hecmedia.org/category/arts/" />);

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      GET_CATEGORY_NAV_NODE,
      expect.objectContaining({ variables: { id: "/category/arts/" } })
    );
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      GET_CATEGORY_NAV_CHILDREN,
      expect.objectContaining({ variables: { parent: 3 }, skip: false })
    );
    expect(screen.getByRole("link", { name: "Arts" })).toHaveAttribute(
      "href",
      "/category/arts/"
    );
    expect(screen.getByRole("link", { name: "Music" })).toHaveAttribute(
      "href",
      "/category/arts/music/"
    );
  });

  it("uses the parent returned for a child route and marks that child active", () => {
    useQuery.mockImplementation(document => {
      if (document === GET_CATEGORY_NAV_NODE) {
        return {
          data: {
            category: {
              ...child,
              databaseId: 18,
              parent: { node: parent }
            }
          }
        };
      }
      if (document === GET_CATEGORY_NAV_CHILDREN) {
        return { data: { categories: { nodes: [child] } } };
      }
      throw new Error("Unexpected query");
    });

    render(<CategoryNav link="https://hecmedia.org/category/arts/music/" />);

    expect(screen.getByText("Music").tagName).toBe("DIV");
    expect(screen.queryByRole("link", { name: "Music" })).toBeNull();
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      GET_CATEGORY_NAV_CHILDREN,
      expect.objectContaining({ variables: { parent: 3 }, skip: false })
    );
  });

  it("does not request children before the current category resolves", () => {
    useQuery.mockImplementation(document => {
      if (document === GET_CATEGORY_NAV_NODE) return { data: undefined };
      if (document === GET_CATEGORY_NAV_CHILDREN) return { data: undefined };
      throw new Error("Unexpected query");
    });

    render(<CategoryNav link="https://hecmedia.org/category/arts/" />);

    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      GET_CATEGORY_NAV_CHILDREN,
      expect.objectContaining({ variables: { parent: 0 }, skip: true })
    );
  });
});
