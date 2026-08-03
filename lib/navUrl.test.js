import {
  isExternalNavUrl,
  menuNodeToNavUrl,
  menuNodeToRelativeUrl,
  resolveNavUrl,
  toSiteRelativeUrl
} from "./navUrl";

describe("toSiteRelativeUrl / resolveNavUrl", () => {
  it("keeps relative paths as internal", () => {
    expect(toSiteRelativeUrl("/category/arts/")).toBe("/category/arts/");
    expect(resolveNavUrl("/category/arts/")).toEqual({
      href: "/category/arts/",
      external: false
    });
  });

  it("rewrites staging-wp absolute menu URLs to path-only", () => {
    expect(
      toSiteRelativeUrl("https://staging-wp.hectv.org/category/arts/")
    ).toBe("/category/arts/");
  });

  it("rewrites prod-wp absolute menu URLs to path-only", () => {
    expect(toSiteRelativeUrl("https://prod-wp.hectv.org/posts/foo")).toBe(
      "/posts/foo"
    );
  });

  it("rewrites hectv.org and hecmedia.org to in-app paths", () => {
    expect(toSiteRelativeUrl("https://hectv.org/programs")).toBe("/programs");
    expect(toSiteRelativeUrl("https://www.hectv.org/events?x=1")).toBe(
      "/events?x=1"
    );
    expect(
      toSiteRelativeUrl("https://hecmedia.org/posts/hec-on-youtube#watch")
    ).toBe("/posts/hec-on-youtube#watch");
    expect(
      toSiteRelativeUrl("https://www.hecmedia.org/posts/support-hec")
    ).toBe("/posts/support-hec");
    expect(resolveNavUrl("https://hecmedia.org/posts/support-hec")).toEqual({
      href: "/posts/support-hec",
      external: false
    });
  });

  it("leaves truly external absolute URLs alone and marks them external", () => {
    expect(toSiteRelativeUrl("https://facebook.com/hectv")).toBe(
      "https://facebook.com/hectv"
    );
    expect(resolveNavUrl("https://example.com/partner")).toEqual({
      href: "https://example.com/partner",
      external: true
    });
    expect(isExternalNavUrl("https://facebook.com/hectv")).toBe(true);
    expect(isExternalNavUrl("https://hectv.org/about")).toBe(false);
    expect(isExternalNavUrl("/about")).toBe(false);
  });

  it("allows safe non-http absolute schemes (mailto, tel)", () => {
    expect(resolveNavUrl("mailto:support@hecmedia.org")).toEqual({
      href: "mailto:support@hecmedia.org",
      external: true
    });
    expect(resolveNavUrl("tel:+13145550100")).toEqual({
      href: "tel:+13145550100",
      external: true
    });
    expect(isExternalNavUrl("mailto:support@hecmedia.org")).toBe(true);
    expect(isExternalNavUrl("tel:+13145550100")).toBe(true);
  });

  it("rejects unsafe absolute schemes from CMS-controlled menus", () => {
    // Build scheme strings without a literal "javascript:" token so eslint
    // no-script-url does not reject the regression fixture itself.
    const jsScheme = ["java", "script", ":", "alert(1)"].join("");
    const dataScheme = ["data", ":", "text/html,hi"].join("");
    const vbScheme = ["vbscript", ":", "msgbox(1)"].join("");

    expect(resolveNavUrl(jsScheme)).toEqual({
      href: "/",
      external: false
    });
    expect(resolveNavUrl(dataScheme)).toEqual({
      href: "/",
      external: false
    });
    expect(resolveNavUrl(vbScheme)).toEqual({
      href: "/",
      external: false
    });
    expect(isExternalNavUrl(jsScheme)).toBe(false);
    expect(isExternalNavUrl(dataScheme)).toBe(false);
    // menu node with unsafe absolute url must not leak into href
    expect(
      menuNodeToNavUrl({
        path: "/safe",
        url: jsScheme
      })
    ).toEqual({
      href: "/safe",
      external: false
    });
  });

  it("prefers absolute GraphQL url over a misleading path for custom links", () => {
    // Absolute url wins so external custom links cannot collapse to a bogus path.
    expect(
      menuNodeToRelativeUrl({
        path: "/hectv",
        url: "https://facebook.com/hectv"
      })
    ).toBe("https://facebook.com/hectv");

    expect(
      menuNodeToNavUrl({
        path: "/hectv",
        url: "https://facebook.com/hectv"
      })
    ).toEqual({
      href: "https://facebook.com/hectv",
      external: true
    });
  });

  it("strips hecmedia.org custom-link path mirrors to in-app routes", () => {
    // Live WPGraphQL sets path to the full absolute for some custom links.
    expect(
      menuNodeToNavUrl({
        path: "https://hecmedia.org/posts/hec-on-youtube",
        url: "https://hecmedia.org/posts/hec-on-youtube"
      })
    ).toEqual({
      href: "/posts/hec-on-youtube",
      external: false
    });
  });

  it("prefers GraphQL path on menu nodes when url is not absolute", () => {
    expect(
      menuNodeToRelativeUrl({
        path: "/category/books/",
        url: ""
      })
    ).toBe("/category/books/");
  });
});
