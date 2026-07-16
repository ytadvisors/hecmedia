import * as types from "../types/eventTypes";
import {
  loadEventAction,
  loadEventListAction,
  loadAllEventsAction,
  loadEventCategoriesAction
} from "./eventActions";

describe("eventActions", () => {
  it("creates a load-event action", () => {
    expect(loadEventAction("5")).toEqual({
      type: types.LOAD_EVENT,
      eventId: "5"
    });
  });

  it("creates a load-event-list action with a default day", () => {
    expect(loadEventListAction()).toEqual({
      type: types.LOAD_EVENT_LIST,
      eventDay: ""
    });
  });

  it("creates a load-all-events action with defaults", () => {
    expect(loadAllEventsAction()).toEqual({
      type: types.LOAD_ALL_EVENTS,
      eventTypes: [],
      eventDay: "",
      page: undefined,
      perPage: 12,
      loadMore: false
    });
  });

  it("creates a load-all-events action with overrides", () => {
    expect(loadAllEventsAction(["music"], "monday", 2, true, 6)).toEqual({
      type: types.LOAD_ALL_EVENTS,
      eventTypes: ["music"],
      eventDay: "monday",
      page: 2,
      perPage: 6,
      loadMore: true
    });
  });

  it("creates a load-event-categories action with defaults", () => {
    expect(loadEventCategoriesAction()).toEqual({
      type: types.LOAD_EVENT_CATEGORIES,
      page: 1,
      perPage: 12
    });
  });
});
