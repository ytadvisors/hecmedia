import axios from "axios";
import PostApi from "./PostApi";

jest.mock("axios");

describe("PostApi", () => {
  let rootApi;
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    rootApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    jsonApi = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { headers: { common: {} } }
    };
    let call = 0;
    axios.create.mockImplementation(() => {
      call += 1;
      return call === 1 ? rootApi : jsonApi;
    });
    api = new PostApi({ url: "https://hectv.org" });
  });

  it("gets comments for a post", () => {
    api.getComments("my-slug", 2);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "comments?post=my-slug&page=2&order=desc"
    );
  });

  it("adds a comment as a querystring payload", () => {
    api.addComment({ post: "1", content: "hi" });

    expect(jsonApi.post).toHaveBeenCalledWith("comments", "content=hi&post=1");
  });

  it("gets subcategories for a parent", () => {
    api.getSubCategories("news");

    expect(jsonApi.get).toHaveBeenCalledWith("categoryList?parent=news");
  });

  it("gets a category by slug", () => {
    api.getCategory("news");

    expect(jsonApi.get).toHaveBeenCalledWith("categoryList?slug=news");
  });

  it("gets a category by id", () => {
    api.getCategoryById("3");

    expect(jsonApi.get).toHaveBeenCalledWith("categoryList/3");
  });

  it("gets all posts with no category", () => {
    api.getAllPosts("", 1);

    expect(jsonApi.get).toHaveBeenCalledWith("posts?perPage=10&page=1");
  });

  it("gets all posts filtered by category", () => {
    api.getAllPosts("news", 2);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "posts?perPage=10&page=2&categoryList=news"
    );
  });

  it("finds posts with no search terms", () => {
    api.findPosts({ terms: "", page: 1, perPage: 10 });

    expect(jsonApi.get).toHaveBeenCalledWith("posts?perPage=10&page=1");
  });

  it("finds posts with search terms", () => {
    api.findPosts({ terms: "faith", page: 1, perPage: 10 });

    expect(jsonApi.get).toHaveBeenCalledWith(
      "posts?perPage=10&page=1&search=faith"
    );
  });

  it("gets a list of posts by slug", () => {
    api.getPostList(["a", "b"]);

    expect(jsonApi.get).toHaveBeenCalledWith("posts?slug[]=a&slug[]=b");
  });

  it("gets a post by id", () => {
    api.getPost("5");

    expect(jsonApi.get).toHaveBeenCalledWith("posts/5");
  });

  it("gets posts across multiple categories", () => {
    api.getCategoriesPosts(["news", "faith"], 1, 3);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "posts?per_page=3&page=1&categories[]=news&categories[]=faith"
    );
  });

  it("gets posts by slugs", () => {
    api.getPostsBySlugs(["x", "y"]);

    expect(jsonApi.get).toHaveBeenCalledWith("posts?slug[]=x&slug[]=y");
  });

  it("gets a post by slug", () => {
    api.getPostBySlug("my-post");

    expect(jsonApi.get).toHaveBeenCalledWith("posts?slug=my-post");
  });

  it("gets articles by page", () => {
    api.getArticles(2);

    expect(jsonApi.get).toHaveBeenCalledWith("posts?articles=1&page=2");
  });

  it("gets live videos from the root api", () => {
    api.getLiveVideos();

    expect(rootApi.get).toHaveBeenCalledWith(
      "/wp-json/hectv/v1/livevideos/live"
    );
  });
});
