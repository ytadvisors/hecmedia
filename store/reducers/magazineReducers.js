import * as types from "../types/magazineTypes";

const initialState = {
  magazines: [],
  magazine: {},
  magazine_list: [],
  numResults: {
    magazines: 0
  }
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_ALL_MAGAZINES:
    case types.LOAD_MAGAZINE_LIST:
    case types.LOAD_MAGAZINE:
      return {
        ...state,
        error: false
      };

    case types.SET_ALL_MAGAZINES:
      return {
        ...state,
        magazines: action.loadMore
          ? [...state.magazines, ...action.magazines]
          : action.magazines,
        numResults: {
          ...state.numResults,
          magazines: action.numResults
        },
        error: false
      };
    case types.SET_MAGAZINE_LIST:
      return {
        ...state,
        magazine_list: action.loadMore
          ? [...state.magazine_list, ...action.magazine_list]
          : action.magazine_list,
        error: false
      };
    case types.SET_MAGAZINE:
      return {
        ...state,
        magazine: action.loadMore
          ? [...state.magazine, ...action.magazine]
          : action.magazine,
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
