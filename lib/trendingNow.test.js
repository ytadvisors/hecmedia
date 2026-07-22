import toTrendingNowItems from "./trendingNow";

describe("toTrendingNowItems", () => {
  it("adapts Spotlight posts without exposing the temporary source to the UI", () => {
    expect(
      toTrendingNowItems([
        {
          postId: 3,
          title: "Latest story",
          link: "https://hectv.org/posts/latest",
          postDetails: { videoImage: { medium: "https://img.test/latest.jpg" } }
        }
      ])
    ).toEqual([
      {
        id: 3,
        title: "Latest story",
        href: "/posts/latest",
        image: "https://img.test/latest.jpg"
      }
    ]);
  });

  it("returns an empty list when no source posts are available", () => {
    expect(toTrendingNowItems()).toEqual([]);
  });
});
