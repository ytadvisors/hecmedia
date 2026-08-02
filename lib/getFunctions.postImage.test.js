import { getPostImgSrc, getPostPageImgSrc } from "./getFunctions";

const hero = { medium: "https://img.test/hero-m.jpg", large: "https://img.test/hero-l.jpg" };
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
    expect(getPostImgSrc({ postDetails: { postHero: hero, postHeader: header } })).toBe(
      header.large
    );
  });

  it("uses medium when type is small", () => {
    expect(getPostImgSrc(post, "small")).toBe(video.medium);
  });
});

describe("getPostPageImgSrc (main article page)", () => {
  it("prefers postHero over shared thumbnails", () => {
    expect(getPostPageImgSrc(post)).toBe(hero.large);
  });

  it("falls back to videoImage / postHeader when postHero is empty", () => {
    expect(
      getPostPageImgSrc({ postDetails: { postHeader: header, videoImage: video } })
    ).toBe(video.large);
    expect(getPostPageImgSrc({ postDetails: { postHeader: header } })).toBe(header.large);
  });
});
