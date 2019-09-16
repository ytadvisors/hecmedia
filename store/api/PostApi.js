import querystring from "query-string";
import MainApi from "./index";

export default class PostApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getComments = (slug, page = 1) =>
    this.jsonApi.get(`comments?post=${slug}&page=${page}&order=desc`);

  addComment = params => {
    const query = querystring.stringify(params);
    return this.jsonApi.post(`comments`, query);
  };

  getSubCategories = parent =>
    this.jsonApi.get(`categoryList?parent=${parent}`);

  getCategory = slug => this.jsonApi.get(`categoryList?slug=${slug}`);

  getCategoryById = id => this.jsonApi.get(`categoryList/${id}`);

  getAllPosts = (pageCategory = "", page = 1) => {
    if (pageCategory === "")
      return this.jsonApi.get(`posts?perPage=10&page=${page}`);

    return this.jsonApi.get(
      `posts?perPage=10&page=${page}&categoryList=${pageCategory}`
    );
  };

  findPosts = ({ terms, page = 1, perPage = 10 }) => {
    if (terms === "")
      return this.jsonApi.get(`posts?perPage=${perPage}&page=${page}`);

    return this.jsonApi.get(
      `posts?perPage=${perPage}&page=${page}&search=${terms}`
    );
  };

  getPostList = posts =>
    this.jsonApi.get(`posts?slug[]=${posts.join("&slug[]=")}`);

  getPost = postId => this.jsonApi.get(`posts/${postId}`);

  getCategoriesPosts = (categoryList = [], page = 1, perPage = 3) =>
    this.jsonApi.get(
      `posts?per_page=${perPage}&page=${page}&categories[]=${categoryList.join(
        "&categories[]="
      )}`
    );

  getPostsBySlugs = slugs => {
    const query = slugs.join("&slug[]=");
    return this.jsonApi.get(`posts?slug[]=${query}`);
  };

  getPostBySlug = slug => this.jsonApi.get(`posts?slug=${slug}`);

  getArticles = (page = 1) => this.jsonApi.get(`posts?articles=1&page=${page}`);

  getLiveVideos = () => this.rootApi.get(`/wp-json/hectv/v1/livevideos/live`);
}
