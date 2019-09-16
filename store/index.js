import { createStore as reduxCreateStore, applyMiddleware } from "redux";
import logger from "redux-logger";
import { composeWithDevTools } from "redux-devtools-extension";
import nextReduxWrapper from "next-redux-wrapper";
import nextReduxSaga from "next-redux-saga";
import createSagaMiddleware from "redux-saga";
import mainSaga from "./sagas";
import reducers from "./reducers";

const sagaMiddleware = createSagaMiddleware();

const middlewares = [sagaMiddleware];

if (process.env.NODE_ENV !== "production") middlewares.push(logger);

const bindMiddleware = middleware => {
  if (process.env.NODE_ENV !== "production") {
    return composeWithDevTools(applyMiddleware(...middleware));
  }
  return applyMiddleware(...middleware);
};

export const configureStore = (initialState = {}) => {
  const store = reduxCreateStore(
    reducers,
    initialState,
    bindMiddleware(middlewares)
  );

  // Extensions
  store.runSaga = sagaMiddleware.run(mainSaga);
  store.sagaTask = store.runSaga;
  store.asyncReducers = {}; // Async reducer registry
  return store;
};

export default function(BaseComponent) {
  return nextReduxWrapper(configureStore)(nextReduxSaga(BaseComponent));
}
