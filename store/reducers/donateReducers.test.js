import reducer from "./donateReducers";
import * as types from "../types/donateTypes";

describe("donateReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual({
      donations: [],
      donation: {},
      numResults: { donation: 0, donations: 0 }
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { donations: [], donation: {}, numResults: {}, error: true },
      { type: types.LOAD_ALL_DONATIONS }
    );

    expect(state.error).toBe(false);
  });

  it("replaces donations when loadMore is false", () => {
    const state = reducer(undefined, {
      type: types.SET_ALL_DONATIONS,
      donations: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });

    expect(state.donations).toEqual([{ id: 1 }]);
    expect(state.numResults.donations).toBe(1);
  });

  it("appends donations when loadMore is true", () => {
    const seeded = reducer(undefined, {
      type: types.SET_ALL_DONATIONS,
      donations: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });
    const state = reducer(seeded, {
      type: types.SET_ALL_DONATIONS,
      donations: [{ id: 2 }],
      numResults: 2,
      loadMore: true
    });

    expect(state.donations).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("sets a single donation", () => {
    const state = reducer(undefined, {
      type: types.SET_DONATION,
      donation: { id: 9 },
      loadMore: false
    });

    expect(state.donation).toEqual({ id: 9 });
  });

  it("sets the error flag on LOAD_ERROR", () => {
    const state = reducer(undefined, { type: types.LOAD_ERROR });

    expect(state.error).toBe(true);
  });
});
