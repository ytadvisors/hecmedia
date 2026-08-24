import {
  getPostImgSrc,
  getPostPageImgSrc,
  getPostImgSrcSet,
  getPostImgSizes
} from "./getFunctions";

const hero = {
  medium: "https://img.test/hero-m.jpg",
  large: "https://img.test/hero-l.jpg"
};
const header = {
  medium: "https://img.test/header-m.jpg",
  large: "https://img.test/header-l.jpg"
};
const video = {
  medium: "https://img.test/video-m.jpg",
  large: "https://img.test/video-l.jpg"
};

const post = {
  postDetails: {
    postHero: hero,
    postHeader: header,
    videoImage: video
  },
  featuredImage: { sourceUrl: "https://img.test/featured.jpg" }
};

describe("getPostImgSrc (cards/search)", () => {
  it("ignores postHero and prefers videoImage then postHeader", () => {
    expect(getPostImgSrc(post)).toBe(video.large);
    expect(
      getPostImgSrc({ postDetails: { postHero: hero, postHeader: header } })
    ).toBe(header.large);
  });

  it("uses medium when type is small", () => {
    expect(getPostImgSrc(post, "small")).toBe(video.medium);
  });

  it("builds a srcset from medium and large derivatives", () => {
    expect(getPostImgSrcSet(post)).toBe(
      `${video.medium} 300w, ${video.large} 768w`
    );
    expect(getPostImgSizes("Featured")).toContain("768px");
    expect(getPostImgSizes("3 Columns")).toContain("33vw");
    expect(getPostImgSizes("Featured")).toContain("max-width: 769px");
  });

  it("omits known-missing public-archive thumbnails from src and srcset", () => {
    const missing = {
      postDetails: {
        videoImage: {
          medium:
            "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2013/01/1319211102_582-250x148.jpg",
          large:
            "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2013/01/1319211102_582.jpg"
        }
      }
    };

    expect(getPostImgSrc(missing)).toBeUndefined();
    expect(getPostImgSrc(missing, "small")).toBeUndefined();
    expect(getPostImgSrcSet(missing)).toBeUndefined();
  });
});

describe("getPostPageImgSrc (main article page)", () => {
  it("prefers postHero over shared thumbnails", () => {
    expect(getPostPageImgSrc(post)).toBe(hero.large);
  });

  it("falls back to videoImage / postHeader when postHero is empty", () => {
    expect(
      getPostPageImgSrc({
        postDetails: { postHeader: header, videoImage: video }
      })
    ).toBe(video.large);
    expect(getPostPageImgSrc({ postDetails: { postHeader: header } })).toBe(
      header.large
    );
  });
});
