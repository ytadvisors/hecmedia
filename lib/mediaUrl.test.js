import getPublicMediaUrl, { rewritePublicMediaHtml } from "./mediaUrl";

describe("getPublicMediaUrl", () => {
  it("serves staging WordPress uploads from the public media bucket", () => {
    expect(
      getPublicMediaUrl(
        "https://staging-wp.hectv.org/wp-content/uploads/2026/07/example image.jpg?size=medium#preview"
      )
    ).toBe(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/example%20image.jpg?size=medium#preview"
    );
  });

  it("leaves non-upload and non-staging URLs unchanged", () => {
    const productionUrl =
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/example.jpg";
    const stagingApiUrl = "https://staging-wp.hectv.org/wp-json/wp/v2/posts";

    expect(getPublicMediaUrl(productionUrl)).toBe(productionUrl);
    expect(getPublicMediaUrl(stagingApiUrl)).toBe(stagingApiUrl);
  });

  it("leaves empty and malformed values unchanged", () => {
    expect(getPublicMediaUrl("")).toBe("");
    expect(getPublicMediaUrl("not a URL")).toBe("not a URL");
  });
});

describe("rewritePublicMediaHtml", () => {
  it("rewrites staging uploads in rendered HTML and srcset", () => {
    const html =
      '<figure><img src="https://staging-wp.hectv.org/wp-content/uploads/2026/07/hero%20image.jpg" srcset="http://staging-wp.hectv.org/wp-content/uploads/2026/07/hero-small.jpg 320w, https://cdn.example.com/hero.jpg 640w"></figure>';

    const rewritten = rewritePublicMediaHtml(html);

    expect(rewritten).toContain(
      'src="https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/hero%20image.jpg"'
    );
    expect(rewritten).toContain(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/hero-small.jpg 320w"
    );
    expect(rewritten).toContain("https://cdn.example.com/hero.jpg 640w");
  });

  it("leaves staging API links and non-staging content unchanged", () => {
    const html =
      '<a href="https://staging-wp.hectv.org/wp-json/wp/v2/posts">API</a><img src="https://cdn.example.com/image.jpg">';

    expect(rewritePublicMediaHtml(html)).toBe(html);
    expect(rewritePublicMediaHtml("")).toBe("");
    expect(rewritePublicMediaHtml(null)).toBeNull();
  });
});
