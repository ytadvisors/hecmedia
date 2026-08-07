import getPublicMediaUrl, {
  getWordPressMediaFallbackUrl,
  rewritePublicMediaHtml
} from "./mediaUrl";

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

  it("serves production WordPress uploads from the public media bucket", () => {
    expect(
      getPublicMediaUrl(
        "https://prod-wp.hectv.org/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBe(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
    );
    expect(
      getPublicMediaUrl(
        "https://prod-wp-ecs.hectv.org/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBe(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
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

  it("rewrites production uploads embedded in rendered HTML", () => {
    const html =
      '<img src="https://prod-wp.hectv.org/wp-content/uploads/2026/07/story.jpg"><a href="https://prod-wp.hectv.org/wp-admin/">Admin</a>';

    const rewritten = rewritePublicMediaHtml(html);

    expect(rewritten).toContain(
      'src="https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"'
    );
    expect(rewritten).toContain('href="https://prod-wp.hectv.org/wp-admin/"');
  });

  it("leaves staging API links and non-staging content unchanged", () => {
    const html =
      '<a href="https://staging-wp.hectv.org/wp-json/wp/v2/posts">API</a><img src="https://cdn.example.com/image.jpg">';

    expect(rewritePublicMediaHtml(html)).toBe(html);
    expect(rewritePublicMediaHtml("")).toBe("");
    expect(rewritePublicMediaHtml(null)).toBeNull();
  });
});

describe("getWordPressMediaFallbackUrl", () => {
  const originalEnvironment = {
    WP_HOST: process.env.WP_HOST,
    GATSBY_WP_HOST: process.env.GATSBY_WP_HOST,
    APOLLO_CLIENT_URI: process.env.APOLLO_CLIENT_URI
  };

  beforeEach(() => {
    delete process.env.WP_HOST;
    delete process.env.GATSBY_WP_HOST;
    delete process.env.APOLLO_CLIENT_URI;
  });

  afterEach(() => {
    Object.entries(originalEnvironment).forEach(([name, value]) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });

  it("maps a public media object back to the active WordPress upload host", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org";

    expect(
      getWordPressMediaFallbackUrl(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg?size=medium"
      )
    ).toBe(
      "https://prod-wp.hectv.org/wp-content/uploads/2026/07/story.jpg?size=medium"
    );
  });

  it("uses the Gatsby WordPress host when WP_HOST is not configured", () => {
    process.env.GATSBY_WP_HOST = "https://prod-wp-ecs.hectv.org/";

    expect(
      getWordPressMediaFallbackUrl(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBe(
      "https://prod-wp-ecs.hectv.org/wp-content/uploads/2026/07/story.jpg"
    );
  });

  it("derives the WordPress origin from the Apollo GraphQL endpoint", () => {
    process.env.APOLLO_CLIENT_URI = "https://prod-wp.hectv.org/graphql";

    expect(
      getWordPressMediaFallbackUrl(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBe("https://prod-wp.hectv.org/wp-content/uploads/2026/07/story.jpg");
  });

  it("returns null when no active WordPress origin is configured", () => {
    expect(
      getWordPressMediaFallbackUrl(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBeNull();
  });

  it("does not invent fallbacks for unrelated origins", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org";

    expect(
      getWordPressMediaFallbackUrl("https://images.example.com/story.jpg")
    ).toBeNull();
  });
});
