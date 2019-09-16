import * as types from "../types/eventTypes";

export const loadEventAction = eventId => ({
  type: types.LOAD_EVENT,
  eventId
});

export const loadEventListAction = (eventDay = "") => ({
  type: types.LOAD_EVENT_LIST,
  eventDay
});

export const loadAllEventsAction = (
  eventTypes = [],
  eventDay = "",
  page,
  loadMore = false,
  perPage = 12
) => ({
  type: types.LOAD_ALL_EVENTS,
  eventTypes,
  eventDay,
  page,
  perPage,
  loadMore
});

export const loadEventCategoriesAction = (page = 1, perPage = 12) => ({
  type: types.LOAD_EVENT_CATEGORIES,
  page,
  perPage
});
