const {
  POST_SLUG_REDIRECTS,
  resolvePostSlugRedirect,
  postSlugRedirectRules
} = require("./post-slug-redirects");

describe("post-slug-redirects", () => {
  it("maps the Educate.Today resources rename to /posts/for-educators", () => {
    expect(
      resolvePostSlugRedirect(
        "educate-today-video-resources-for-classroom-and-homeschool"
      )
    ).toBe("/posts/for-educators");
  });

  it("normalizes case, slashes, and array query values", () => {
    expect(
      resolvePostSlugRedirect(
        "/Educate-Today-Video-Resources-For-Classroom-And-Homeschool/"
      )
    ).toBe("/posts/for-educators");
    expect(
      resolvePostSlugRedirect([
        "educate-today-video-resources-for-classroom-and-homeschool"
      ])
    ).toBe("/posts/for-educators");
  });

  it("returns null for unknown or empty slugs", () => {
    expect(resolvePostSlugRedirect("for-educators")).toBeNull();
    expect(resolvePostSlugRedirect("")).toBeNull();
    expect(resolvePostSlugRedirect(null)).toBeNull();
    expect(resolvePostSlugRedirect(undefined)).toBeNull();
  });

  it("exports next.config redirect rules as HTTP 301", () => {
    const rules = postSlugRedirectRules();
    expect(rules).toEqual(
      expect.arrayContaining([
        {
          source:
            "/posts/educate-today-video-resources-for-classroom-and-homeschool",
          destination: "/posts/for-educators",
          statusCode: 301
        }
      ])
    );
    expect(rules).toHaveLength(Object.keys(POST_SLUG_REDIRECTS).length);
  });
});
