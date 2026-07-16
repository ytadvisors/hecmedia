import reducer from "./scheduleReducers";
import * as types from "../types/scheduleTypes";

describe("scheduleReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual({
      schedules: [],
      schedule: [],
      numResults: { schedule: 0, schedules: 0 }
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { ...reducer(undefined, {}), error: true },
      { type: types.LOAD_ALL_SCHEDULES }
    );

    expect(state.error).toBe(false);
  });

  it("replaces schedules when loadMore is false and appends when true", () => {
    const seeded = reducer(undefined, {
      type: types.SET_ALL_SCHEDULES,
      schedules: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });
    const appended = reducer(seeded, {
      type: types.SET_ALL_SCHEDULES,
      schedules: [{ id: 2 }],
      numResults: 2,
      loadMore: true
    });

    expect(appended.schedules).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("sets a schedule", () => {
    const state = reducer(undefined, {
      type: types.SET_SCHEDULE,
      schedule: [{ id: 1 }],
      loadMore: false
    });

    expect(state.schedule).toEqual([{ id: 1 }]);
  });

  it("sets the daily schedule", () => {
    const state = reducer(undefined, {
      type: types.SET_DAILY_SCHEDULE,
      schedule: [{ id: 2 }],
      loadMore: false
    });

    expect(state.schedule).toEqual([{ id: 2 }]);
  });

  it("sets the error flag on LOAD_ERROR", () => {
    const state = reducer(undefined, { type: types.LOAD_ERROR });

    expect(state.error).toBe(true);
  });
});
