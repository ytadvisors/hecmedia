import { combineReducers } from "redux";

import { loadingBarReducer } from "react-redux-loading-bar";
import accountReducers from "./accountReducers";
import pageReducers from "./pageReducers";
import postReducers from "./postReducers";
import eventReducers from "./eventReducers";
import donateReducers from "./donateReducers";
import magazineReducers from "./magazineReducers";
import scheduleReducers from "./scheduleReducers";
import formReducers from "./formReducers";

export default combineReducers({
  pageReducers,
  accountReducers,
  postReducers,
  eventReducers,
  magazineReducers,
  donateReducers,
  scheduleReducers,
  loadingBar: loadingBarReducer,
  form: formReducers
});
