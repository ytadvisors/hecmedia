import getPublicMediaUrl from "./mediaUrl";

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
