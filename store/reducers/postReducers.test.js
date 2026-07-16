import reducer from "./postReducers";
import * as types from "../types/postTypes";

describe("postReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state.posts).toEqual([]);
    expect(state.numResults).toEqual({
      posts: 0,
      postList: 0,
      categoryPosts: 0,
      subcategories: 0
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { ...reducer(undefined, {}), error: true },
      { type: types.LOAD_ALL_POSTS }
    );

    expect(state.error).toBe(false);
  });

  it("replaces posts when loadMore is false and appends when true", () => {
    const seeded = reducer(undefined, {
      type: types.SET_ALL_POSTS,
      posts: [{ id: 1 }],
      currentPage: 1,
      numResults: 1,
      loadMore: false
    });
    const appended = reducer(seeded, {
      type: types.SET_ALL_POSTS,
      posts: [{ id: 2 }],
      currentPage: 2,
      numResults: 2,
      loadMore: true
    });

    expect(appended.posts).toEqual([{ id: 1 }, { id: 2 }]);
    expect(appended.currentPage).toBe(2);
  });

  it("sets subcategories", () => {
    const state = reducer(undefined, {
      type: types.SET_SUBCATEGORIES,
      subcategories: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });

    expect(state.subcategories).toEqual([{ id: 1 }]);
  });

  it("sets a single post", () => {
    const state = reducer(undefined, {
      type: types.SET_POST,
      post: { id: 2 }
    });

    expect(state.post).toEqual({ id: 2 });
  });

  it("sets posts in category", () => {
    const state = reducer(undefined, {
      type: types.SET_POSTS_IN_CATEGORY,
      categoryPosts: [{ id: 3 }],
      numResults: 1,
      loadMore: false
    });

    expect(state.categoryPosts).toEqual([{ id: 3 }]);
  });

  it("sets the playing live video", () => {
    const state = reducer(undefined, {
      type: types.SET_PLAYING_LIVE,
      playingLive: { id: 4 }
    });

    expect(state.playingLive).toEqual({ id: 4 });
  });

  it("sets the error flag on LOAD_ERROR", () => {
    const state = reducer(undefined, { type: types.LOAD_ERROR });

    expect(state.error).toBe(true);
  });
});
