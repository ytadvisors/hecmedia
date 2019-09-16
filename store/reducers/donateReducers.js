import * as types from "../types/donateTypes";

const initialState = {
  donations: [],
  donation: {},
  numResults: {
    donation: 0,
    donations: 0
  }
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_ALL_DONATIONS:
    case types.LOAD_DONATION:
      return {
        ...state,
        error: false
      };

    // Results
    case types.SET_ALL_DONATIONS:
      return {
        ...state,
        donations: action.loadMore
          ? [...state.donations, ...action.donations]
          : action.donations,
        numResults: {
          ...state.numResults,
          donations: action.numResults
        },
        error: false
      };
    case types.SET_DONATION:
      return {
        ...state,
        donation: action.loadMore
          ? [...state.donation, ...action.donation]
          : action.donation,
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
