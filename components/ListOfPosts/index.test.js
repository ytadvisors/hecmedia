import { getWallpaperBackgroundImage } from "./index";

describe("ListOfPosts media backgrounds", () => {
  const originalWpHost = process.env.WP_HOST;

  afterEach(() => {
    if (originalWpHost === undefined) delete process.env.WP_HOST;
    else process.env.WP_HOST = originalWpHost;
  });

  it("layers the active WordPress and local fallbacks below public media", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org";

    expect(
      getWallpaperBackgroundImage(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"
      )
    ).toBe(
      'url("https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/story.jpg"), url("https://prod-wp.hectv.org/wp-content/uploads/2026/07/story.jpg"), url("/static/assets/nothumbnail.png")'
    );
  });

  it("uses the local placeholder once when no media source exists", () => {
    expect(getWallpaperBackgroundImage()).toBe(
      'url("/static/assets/nothumbnail.png")'
    );
  });
});
