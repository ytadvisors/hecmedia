import * as types from "../types/postTypes";

export const loadPostWithSlugAction = slug => ({
  type: types.LOAD_POST_SLUG,
  slug
});

export const loadLiveVideosAction = () => ({
  type: types.LOAD_LIVE_VIDEOS
});

export const loadSearchPostsAction = (
  apiUrl,
  terms,
  page,
  loadMore = false
) => ({
  type: types.LOAD_SEARCH_POSTS,
  apiUrl,
  terms,
  page,
  loadMore
});

export const loadSubCategoriesAction = category => ({
  type: types.LOAD_SUBCATEGORIES,
  category
});

export const loadAllPostsAction = (category = "", page, loadMore = false) => ({
  type: types.LOAD_ALL_POSTS,
  category,
  page,
  loadMore
});
