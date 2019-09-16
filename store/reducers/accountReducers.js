import * as types from "../types/accountTypes";

const initialState = {
  user: {
    token: ""
  },
  about: {
    country: "US"
  },
  error: false
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.LOGIN:
    case types.LOAD_USER:
    case types.UPDATE_USER:
    case types.REGISTER:
      return {
        ...state,
        error: false
      };

    // Results
    case types.SAVE_USER_INFORMATION:
      return {
        ...state,
        user: action.values
      };
    case types.SAVE_ABOUT_INFORMATION:
      return {
        ...state,
        about: action.values
      };
    case types.SET_LOGIN:
    case types.SET_USER:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.values
        }
      };
    case types.SET_UPDATE_USER:
      return {
        ...state
      };
    case types.LOGOUT:
      return {
        ...state,
        user: initialState.user,
        about: initialState.about
      };
    case types.SET_REGISTERED:
      return {
        ...state
      };
    // Errors
    case types.LOAD_ERROR:
    case types.LOGIN_ERROR:
    case types.REGISTER_ERROR:
    case types.EMAIL_ERROR:
      return {
        ...state,
        error: true
      };

    default:
      return state;
  }
};
