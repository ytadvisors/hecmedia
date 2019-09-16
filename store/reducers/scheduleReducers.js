import * as types from "../types/scheduleTypes";

const initialState = {
  schedules: [],
  schedule: [],
  numResults: {
    schedule: 0,
    schedules: 0
  }
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_ALL_SCHEDULES:
    case types.LOAD_SCHEDULE:
    case types.LOAD_DAILY_SCHEDULE:
      return {
        ...state,
        error: false
      };

    // Results
    case types.SET_ALL_SCHEDULES:
      return {
        ...state,
        schedules: action.loadMore
          ? [...state.schedules, ...action.schedules]
          : action.schedules,
        numResults: {
          ...state.numResults,
          schedules: action.numResults
        },
        error: false
      };
    case types.SET_SCHEDULE:
      return {
        ...state,
        schedule: action.loadMore
          ? [...state.schedule, ...action.schedule]
          : action.schedule,
        error: false
      };
    case types.SET_DAILY_SCHEDULE:
      return {
        ...state,
        schedule: action.loadMore
          ? [...state.schedule, ...action.schedule]
          : action.schedule,
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
