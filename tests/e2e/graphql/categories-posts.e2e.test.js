import {
  GET_ALL_PAGE_CATEGORY,
  GET_ARTICLES,
  GET_PAGE_INFO,
  GET_PAGE_CATEGORY,
  GET_CATEGORY_ID,
  GET_CATEGORY_INFO,
  GET_SEARCH_RESULTS
} from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

function assertArticleNodeShape(node) {
  expect(typeof node.title).toBe("string");
  expect(typeof node.postId).toBe("number");
  expect(typeof node.slug).toBe("string");
  expect(typeof node.link).toBe("string");
  expect(Array.isArray(node.categories.edges)).toBe(true);
}

describe("AllCategories (components/SubNavigation/CategoryNav.js)", () => {
  it("returns a paginated category tree", async () => {
    const result = await executeQuery(GET_ALL_PAGE_CATEGORY, { cursor: "" });

    expect(result.errors).toBeUndefined();
    const { categories } = result.data;

    expect(Array.isArray(categories.nodes)).toBe(true);
    expect(typeof categories.pageInfo.hasNextPage).toBe("boolean");
    categories.nodes.forEach(node => {
      expect(typeof node.name).toBe("string");
      expect(typeof node.link).toBe("string");
      expect(Array.isArray(node.children.nodes)).toBe(true);
    });
  });
});

describe("ArticlesInfo (containers/_templates/articles.js)", () => {
  it("returns a page of non-video posts", async () => {
    const result = await executeQuery(GET_ARTICLES, { cursor: "" });

    expect(result.errors).toBeUndefined();
    const { postData } = result.data;

    expect(Array.isArray(postData.edges)).toBe(true);
    postData.edges.forEach(({ node }) => assertArticleNodeShape(node));
  });
});

describe("CurrentPost + PageCategory (pages/posts/[slug].js)", () => {
  // pages/posts/[slug].js fetches a single post, then fires a second query
  // (GET_PAGE_CATEGORY) using that post's real category IDs — chain the same
  // way here instead of guessing an ID, so the test tracks real data.
  it("resolves a real post and its related-category feed", async () => {
    const articles = await executeQuery(GET_ARTICLES, { cursor: "" });
    const sample = articles.data.postData.edges[0];
    if (!sample) return; // empty result set is acceptable, see TESTING.md#e2e

    const postResult = await executeQuery(GET_PAGE_INFO, {
      slug: sample.node.slug
    });
    const { post, podcasts } = postResult.data;

    expect(Array.isArray(podcasts.nodes)).toBe(true);
    expect(post).not.toBeNull();
    expect(typeof post.title).toBe("string");
    expect(typeof post.slug).toBe("string");
    expect(Array.isArray(post.categories.edges)).toBe(true);
    // A few legacy posts have a null custom-field value; this is valid WP
    // content, while a non-boolean non-null value would break the consumer.
    expect(
      post.postDetails.isVideo === null ||
        typeof post.postDetails.isVideo === "boolean"
    ).toBe(true);

    const categoryIds = post.categories.edges.map(e => e.node.categoryId);
    const categoryResult = await executeQuery(GET_PAGE_CATEGORY, {
      categories: categoryIds
    });
    expect(categoryResult.errors).toBeUndefined();
    expect(Array.isArray(categoryResult.data.categoryPosts.edges)).toBe(true);
    categoryResult.data.categoryPosts.edges.forEach(({ relatedPost }) => {
      expect(typeof relatedPost.title).toBe("string");
      expect(typeof relatedPost.slug).toBe("string");
    });
  });
});

describe("CategoryIdInfo + CategoryInfo (containers/_templates/category.js)", () => {
  it("resolves a category slug to an ID and lists its posts", async () => {
    const idResult = await executeQuery(GET_CATEGORY_ID, {
      category: "arts"
    });
    expect(idResult.errors).toBeUndefined();
    expect(Array.isArray(idResult.data.categoryInfo.edges)).toBe(true);

    const infoResult = await executeQuery(GET_CATEGORY_INFO, {
      category: "arts",
      cursor: ""
    });
    expect(infoResult.errors).toBeUndefined();
    const { postData } = infoResult.data;
    expect(Array.isArray(postData.edges)).toBe(true);
    postData.edges.forEach(({ node }) => assertArticleNodeShape(node));
  });
});

describe("SearchResults (pages/search/[words].js)", () => {
  it("returns a paginated post list for a search term", async () => {
    const result = await executeQuery(GET_SEARCH_RESULTS, {
      search: "the",
      cursor: ""
    });

    expect(result.errors).toBeUndefined();
    const { postData } = result.data;
    expect(Array.isArray(postData.edges)).toBe(true);
    postData.edges.forEach(({ node }) => assertArticleNodeShape(node));
  });
});
