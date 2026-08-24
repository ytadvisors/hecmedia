import selectRelatedPosts from "./relatedPosts";

const post = (postId, slug, categories) => ({
  postId,
  slug,
  categories: {
    edges: categories.map(categoryId => ({ node: { categoryId } }))
  }
});

describe("selectRelatedPosts", () => {
  it("keeps a stable taxonomy-matching order and excludes the current post", () => {
    const currentPost = post(10, "documentaries", [7]);
    const productionOne = post(11, "production-one", [7]);
    const productionTwo = post(12, "production-two", [7, 9]);
    const productionThree = post(13, "production-three", [7]);
    const weeklyBlog = post(20, "weekly-blog", [9]);

    const input = {
      currentPost,
      categoryIds: [7],
      editorial: [{ relatedPost: weeklyBlog }, { relatedPost: productionOne }],
      fallback: [
        { relatedPost: currentPost },
        { relatedPost: productionOne },
        { relatedPost: productionTwo },
        { relatedPost: productionThree }
      ]
    };

    expect(selectRelatedPosts(input).map(item => item.slug)).toEqual([
      "production-one",
      "production-two",
      "production-three"
    ]);
    expect(selectRelatedPosts(input).map(item => item.slug)).toEqual(
      selectRelatedPosts(input).map(item => item.slug)
    );
  });

  it("uses editorial relationships when a post has no taxonomy", () => {
    const manual = post(2, "manual", [9]);
    expect(
      selectRelatedPosts({
        currentPost: { postId: 1, slug: "uncategorized" },
        editorial: [{ relatedPost: manual }],
        limit: 3
      })
    ).toEqual([manual]);
  });

  it("ignores malformed and duplicate entries", () => {
    const candidate = post(2, "candidate", [7]);
    expect(
      selectRelatedPosts({
        currentPost: post(1, "current", [7]),
        categoryIds: [7],
        editorial: [null, {}, { relatedPost: candidate }],
        fallback: [{ node: candidate }, candidate]
      })
    ).toEqual([candidate]);
  });
});
