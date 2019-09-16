import { reducer as formReducer } from "redux-form";
import * as types from "../types/formTypes";

const userInitialState = {
  values: {}
};

export default formReducer.plugin({
  user: (state = userInitialState, action) => {
    switch (action.type) {
      case types.LOGIN_FAIL:
        return {
          ...state,
          values: {
            ...state.values,
            password: undefined, // <----- clear password value
            confirm_password: undefined
          },
          fields: {
            ...state.fields,
            password: undefined,
            confirm_password: undefined
          },
          saved: {
            ...state.values,
            password: undefined, // <----- clear password value
            confirm_password: undefined
          }
        };
      case types.LOAD_USER_VALUES:
        return {
          ...state,
          values: {
            ...state.values,
            ...action.values
          }
        };
      default:
        return state;
    }
  },
  search: (state = userInitialState, action) => {
    switch (action.type) {
      default:
        return state;
    }
  },
  schedule: (state = userInitialState, action) => {
    switch (action.type) {
      case types.LOAD_SCHEDULE_VALUES:
        return {
          ...state,
          values: {
            ...state.values,
            ...action.values
          }
        };
      default:
        return state;
    }
  },
  newsletter: (state = userInitialState, action) => {
    switch (action.type) {
      case types.LOAD_NEWSLETTER_VALUES:
        return {
          ...state,
          values: {
            ...state.values,
            ...action.values
          }
        };
      default:
        return state;
    }
  },
  contact: (state = userInitialState, action) => {
    switch (action.type) {
      case types.LOAD_CONTACT_VALUES:
        return {
          ...state,
          values: {
            ...state.values,
            ...action.values
          }
        };
      case types.RESET_CONTACT_VALUES:
        return {
          values: userInitialState.values
        };
      default:
        return state;
    }
  },
  comment: (state = userInitialState, action) => {
    switch (action.type) {
      case types.RESET_COMMENT_VALUES:
        return {
          values: userInitialState.values
        };
      default:
        return state;
    }
  }
});
