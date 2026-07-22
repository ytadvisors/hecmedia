import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import CategoryNav, { findCategoryForLink } from "./CategoryNav";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

describe("findCategoryForLink", () => {
  const child = { name: "Films", link: "https://hectv.org/category/films/" };
  const parent = {
    name: "Category",
    link: "https://hectv.org/category/",
    children: { nodes: [child] }
  };

  it("returns the parent for a child match so sibling navigation remains available", () => {
    expect(
      findCategoryForLink([parent], "https://hectv.org/category/films")
    ).toBe(parent);
  });

  it("still returns an exact parent match", () => {
    expect(findCategoryForLink([parent], "https://hectv.org/category")).toBe(
      parent
    );
  });

  it("renders a child category without requiring children on the matched leaf", () => {
    useQuery.mockReturnValue({
      data: {
        categories: { nodes: [parent], pageInfo: { endCursor: "" } }
      },
      fetchMore: jest.fn()
    });

    render(<CategoryNav link="https://hectv.org/category/films/" />);

    expect(screen.getByText("Films")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Category" })).toHaveAttribute(
      "href",
      "/category/"
    );
  });
});
