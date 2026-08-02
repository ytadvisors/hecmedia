import { menuNodeToRelativeUrl, toSiteRelativeUrl } from "./navUrl";

describe("toSiteRelativeUrl", () => {
  it("keeps relative paths", () => {
    expect(toSiteRelativeUrl("/category/arts/")).toBe("/category/arts/");
  });

  it("rewrites staging-wp absolute menu URLs", () => {
    expect(
      toSiteRelativeUrl("https://staging-wp.hectv.org/category/arts/")
    ).toBe("/category/arts/");
  });

  it("rewrites prod-wp absolute menu URLs", () => {
    expect(toSiteRelativeUrl("https://prod-wp.hectv.org/posts/foo")).toBe(
      "/posts/foo"
    );
  });

  it("leaves external social URLs alone", () => {
    expect(toSiteRelativeUrl("https://facebook.com/hectv")).toBe(
      "https://facebook.com/hectv"
    );
  });

  it("prefers GraphQL path on menu nodes", () => {
    expect(
      menuNodeToRelativeUrl({
        path: "/category/books/",
        url: "https://staging-wp.hectv.org/category/books/"
      })
    ).toBe("/category/books/");
  });
});
