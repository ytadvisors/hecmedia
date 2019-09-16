import * as types from "../types/eventTypes";

const initialState = {
  events: [],
  relatedEvents: [],
  event_list: [],
  event: {},
  eventCategories: [],
  numResults: {
    events: 0,
    event_list: 0,
    relatedEvents: 0
  }
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_ALL_EVENTS:
    case types.LOAD_EVENT:
    case types.LOAD_RELATED_EVENTS:
    case types.LOAD_EVENT_LIST:
    case types.LOAD_EVENT_CATEGORIES:
      return {
        ...state,
        error: false
      };

    // Results
    case types.SET_EVENT_LIST:
      return {
        ...state,
        event_list: action.event_list,
        numResults: {
          ...state.numResults,
          event_list: action.numResults
        },
        error: false
      };
    case types.SET_RELATED_EVENTS:
      return {
        ...state,
        relatedEvents: action.relatedEvents,
        numResults: {
          ...state.numResults,
          relatedEvents: action.numResults
        },
        error: false
      };
    case types.SET_ALL_EVENTS:
      return {
        ...state,
        events: action.loadMore
          ? [...state.events, ...action.events]
          : action.events,
        numResults: {
          ...state.numResults,
          events: action.numResults
        },
        error: false
      };
    case types.SET_EVENT:
      return {
        ...state,
        event: action.loadMore
          ? [...state.event, ...action.event]
          : action.event,
        error: false
      };
    case types.SET_EVENT_CATEGORIES:
      return {
        ...state,
        eventCategories: action.loadMore
          ? [...state.eventCategories, ...action.eventCategories]
          : action.eventCategories,
        error: false
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
