import toTrendingNowItems from "./trendingNow";

describe("toTrendingNowItems", () => {
  it("decodes WordPress title entities for text rendering", () => {
    const [item] = toTrendingNowItems([], [
      {
        postId: 7,
        title: "Playing &#038; Winning &amp; Learning",
        link: "/posts/entities"
      }
    ]);

    expect(item.title).toBe("Playing & Winning & Learning");
  });

  it("uses the newest video posts when editors have not curated a list", () => {
    expect(
      toTrendingNowItems([], [
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

  it("uses the standard WordPress featured image when custom image fields are absent", () => {
    const [item] = toTrendingNowItems([], [
      {
        postId: 4,
        title: "Video with a featured image",
        link: "/posts/featured-image",
        featuredImage: { node: { sourceUrl: "https://img.test/featured.jpg" } }
      }
    ]);

    expect(item.image).toBe("https://img.test/featured.jpg");
  });

  it("puts manually featured videos first and fills remaining slots by recency", () => {
    const featured = {
      postId: 8,
      title: "Editor's choice",
      link: "https://hectv.org/posts/editors-choice",
      postDetails: { postHeader: { medium: "https://img.test/featured.jpg" } }
    };
    const newest = {
      postId: 9,
      title: "Newest video",
      link: "https://hectv.org/posts/newest",
      postDetails: { videoImage: { medium: "https://img.test/newest.jpg" } }
    };

    expect(toTrendingNowItems([featured], [featured, newest])).toEqual([
      {
        id: 8,
        title: "Editor's choice",
        href: "/posts/editors-choice",
        image: "https://img.test/featured.jpg"
      },
      {
        id: 9,
        title: "Newest video",
        href: "/posts/newest",
        image: "https://img.test/newest.jpg"
      }
    ]);
  });

  it("returns an empty list when no source posts are available", () => {
    expect(toTrendingNowItems()).toEqual([]);
  });
});
