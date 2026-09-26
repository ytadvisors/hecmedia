import toTrendingNowItems from "./trendingNow";

describe("toTrendingNowItems", () => {
  it("decodes WordPress title entities for text rendering", () => {
    const [item] = toTrendingNowItems(
      [],
      [
        {
          postId: 7,
          title: "Playing &#038; Winning &amp; Learning",
          link: "/posts/entities"
        }
      ]
    );

    expect(item.title).toBe("Playing & Winning & Learning");
  });

  it("uses the newest video posts when editors have not curated a list", () => {
    expect(
      toTrendingNowItems(
        [],
        [
          {
            postId: 3,
            title: "Latest story",
            link: "https://hectv.org/posts/latest",
            postDetails: {
              videoImage: { medium: "https://img.test/latest.jpg" }
            }
          }
        ]
      )
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
    const [item] = toTrendingNowItems(
      [],
      [
        {
          postId: 4,
          title: "Video with a featured image",
          link: "/posts/featured-image",
          featuredImage: {
            node: { sourceUrl: "https://img.test/featured.jpg" }
          }
        }
      ]
    );

    expect(item.image).toBe("https://img.test/featured.jpg");
  });

  it("uses the direct featured-image shape returned by legacy WordPress", () => {
    const [item] = toTrendingNowItems(
      [],
      [
        {
          postId: 41,
          title: "Legacy featured image",
          link: "/posts/legacy-featured-image",
          featuredImage: { sourceUrl: "https://img.test/legacy.jpg" }
        }
      ]
    );

    expect(item.image).toBe("https://img.test/legacy.jpg");
  });

  it("keeps posts without a WordPress featured image from crashing the rail", () => {
    const [item] = toTrendingNowItems(
      [],
      [
        {
          postId: 5,
          title: "Video without an image",
          link: "/posts/no-image",
          featuredImage: null
        }
      ]
    );

    expect(item).toEqual({
      id: 5,
      title: "Video without an image",
      href: "/posts/no-image",
      image: null
    });
  });

  it("prefers a custom video image over the standard WordPress fallback", () => {
    const [item] = toTrendingNowItems(
      [],
      [
        {
          postId: 6,
          title: "Video with both image types",
          link: "/posts/custom-image",
          postDetails: {
            videoImage: { medium: "https://img.test/custom.jpg" }
          },
          featuredImage: {
            node: { sourceUrl: "https://img.test/wordpress.jpg" }
          }
        }
      ]
    );

    expect(item.image).toBe("https://img.test/custom.jpg");
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

  it("defaults the curated-plus-newest list to five items", () => {
    const post = postId => ({
      postId,
      title: `Video ${postId}`,
      link: `/posts/video-${postId}`
    });

    expect(
      toTrendingNowItems(
        [post(1), post(2)],
        [post(3), post(4), post(5), post(6)]
      )
    ).toHaveLength(5);
    expect(
      toTrendingNowItems(
        [post(1), post(2)],
        [post(3), post(4), post(5), post(6)]
      ).map(item => item.id)
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("honors CMS maxVideos above the default", () => {
    const post = postId => ({
      postId,
      title: `Video ${postId}`,
      link: `/posts/video-${postId}`
    });

    expect(
      toTrendingNowItems(
        [post(1)],
        [post(2), post(3), post(4), post(5), post(6)],
        5
      )
    ).toHaveLength(5);
    expect(
      toTrendingNowItems(
        [],
        [post(1), post(2), post(3), post(4), post(5), post(6)],
        6
      )
    ).toHaveLength(6);
  });
});
