import reducer from "./magazineReducers";
import * as types from "../types/magazineTypes";

describe("magazineReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual({
      magazines: [],
      magazine: {},
      magazine_list: [],
      numResults: { magazines: 0 }
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { ...reducer(undefined, {}), error: true },
      { type: types.LOAD_MAGAZINE }
    );

    expect(state.error).toBe(false);
  });

  it("replaces magazines when loadMore is false and appends when true", () => {
    const seeded = reducer(undefined, {
      type: types.SET_ALL_MAGAZINES,
      magazines: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });
    const appended = reducer(seeded, {
      type: types.SET_ALL_MAGAZINES,
      magazines: [{ id: 2 }],
      numResults: 2,
      loadMore: true
    });

    expect(appended.magazines).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("sets the magazine list", () => {
    const state = reducer(undefined, {
      type: types.SET_MAGAZINE_LIST,
      magazine_list: [{ id: 3 }],
      loadMore: false
    });

    expect(state.magazine_list).toEqual([{ id: 3 }]);
  });

  it("sets a single magazine", () => {
    const state = reducer(undefined, {
      type: types.SET_MAGAZINE,
      magazine: { id: 4 },
      loadMore: false
    });

    expect(state.magazine).toEqual({ id: 4 });
  });

  it("sets the error flag on LOAD_ERROR", () => {
    const state = reducer(undefined, { type: types.LOAD_ERROR });

    expect(state.error).toBe(true);
  });
});
