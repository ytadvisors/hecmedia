import reducer from "./eventReducers";
import * as types from "../types/eventTypes";

describe("eventReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual({
      events: [],
      relatedEvents: [],
      event_list: [],
      event: {},
      eventCategories: [],
      numResults: { events: 0, event_list: 0, relatedEvents: 0 }
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { ...reducer(undefined, {}), error: true },
      { type: types.LOAD_EVENT }
    );

    expect(state.error).toBe(false);
  });

  it("sets the event list", () => {
    const state = reducer(undefined, {
      type: types.SET_EVENT_LIST,
      event_list: [{ id: 1 }],
      numResults: 1
    });

    expect(state.event_list).toEqual([{ id: 1 }]);
    expect(state.numResults.event_list).toBe(1);
  });

  it("sets related events", () => {
    const state = reducer(undefined, {
      type: types.SET_RELATED_EVENTS,
      relatedEvents: [{ id: 2 }],
      numResults: 1
    });

    expect(state.relatedEvents).toEqual([{ id: 2 }]);
  });

  it("replaces events when loadMore is false and appends when true", () => {
    const seeded = reducer(undefined, {
      type: types.SET_ALL_EVENTS,
      events: [{ id: 1 }],
      numResults: 1,
      loadMore: false
    });
    const appended = reducer(seeded, {
      type: types.SET_ALL_EVENTS,
      events: [{ id: 2 }],
      numResults: 2,
      loadMore: true
    });

    expect(appended.events).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("sets a single event", () => {
    const state = reducer(undefined, {
      type: types.SET_EVENT,
      event: { id: 3 },
      loadMore: false
    });

    expect(state.event).toEqual({ id: 3 });
  });

  it("sets event categories", () => {
    const state = reducer(undefined, {
      type: types.SET_EVENT_CATEGORIES,
      eventCategories: [{ id: 4 }],
      loadMore: false
    });

    expect(state.eventCategories).toEqual([{ id: 4 }]);
  });

  it("sets the error flag on LOAD_ERROR", () => {
    const state = reducer(undefined, { type: types.LOAD_ERROR });

    expect(state.error).toBe(true);
  });
});
