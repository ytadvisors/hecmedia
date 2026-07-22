import { findCategoryForLink } from "./CategoryNav";

describe("findCategoryForLink", () => {
  const child = { name: "Films", link: "https://hectv.org/category/films/" };
  const parent = {
    name: "Category",
    link: "https://hectv.org/category/",
    children: { nodes: [child] }
  };

  it("returns the dynamic child route instead of its parameterless parent", () => {
    expect(
      findCategoryForLink([parent], "https://hectv.org/category/films")
    ).toBe(child);
  });

  it("still returns an exact parent match", () => {
    expect(findCategoryForLink([parent], "https://hectv.org/category")).toBe(
      parent
    );
  });
});
