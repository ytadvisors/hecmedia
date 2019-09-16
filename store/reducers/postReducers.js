import * as types from "../types/postTypes";

const initialState = {
  selectedVideo: {},
  category: "",
  posts: [],
  categoryPosts: [],
  comments: [],
  postList: [],
  subcategories: [],
  currentPage: 1,
  post: {},
  liveVideos: [],
  numResults: {
    posts: 0,
    postList: 0,
    categoryPosts: 0,
    subcategories: 0
  }
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_COMMENTS:
    case types.LOAD_ALL_POSTS:
    case types.LOAD_POST:
    case types.LOAD_POSTS_IN_CATEGORY:
    case types.LOAD_SUBCATEGORIES:
    case types.LOAD_LIVE_VIDEOS:
    case types.LOAD_POST_SLUG:
      return {
        ...state,
        error: false
      };

    case types.SET_ALL_POSTS:
      return {
        ...state,
        posts: action.loadMore
          ? [...state.posts, ...action.posts]
          : action.posts,
        currentPage: action.currentPage,
        numResults: {
          ...state.numResults,
          posts: action.numResults
        },
        error: false
      };
    case types.SET_SUBCATEGORIES:
      return {
        ...state,
        subcategories: action.loadMore
          ? [...state.subcategories, ...action.subcategories]
          : action.subcategories,
        numResults: {
          ...state.numResults,
          subcategories: action.numResults
        },
        error: false
      };
    case types.SET_POST:
      return {
        ...state,
        post: action.post,
        error: false
      };
    case types.SET_POSTS_IN_CATEGORY:
      return {
        ...state,
        categoryPosts: action.loadMore
          ? [...state.categoryPosts, ...action.categoryPosts]
          : action.categoryPosts,
        numResults: {
          ...state.numResults,
          categoryPosts: action.numResults
        },
        error: false
      };
    case types.SET_LIVE_VIDEOS:
      return {
        ...state,
        liveVideos: action.liveVideos
      };

    // Errors
    case types.LOAD_ERROR:
      return {
        ...state,
        error: true
      };
    default:
      return state;
  }
};
