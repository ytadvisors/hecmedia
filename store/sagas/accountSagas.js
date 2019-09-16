import { put, takeLatest, call, all } from "redux-saga/effects";
import _ from "lodash";
import { Router } from "../../routes";
import AccountApi from "../api/AccountApi";
import * as types from "../types/accountTypes";
import * as formTypes from "../types/formTypes";
import * as pageTypes from "../types/pageTypes";
import sendUserEmail from "../../lib/emailer";
import { setUserToken, deleteUser } from "../../lib/session";

const deepMapKeys = require("deep-map-keys");

/*-----------------
 *
 * LOAD OPERATIONS
 *
 *------------------*/

/*-----------------
 *
 * CREATE OPERATIONS
 *
 *------------------*/

/**
 *
 * Login to user account function
 *
 * Makes an API request to get a jwt user token.
 *
 * @param email
 * @param password
 */
function* login({ login: { email, password } } = {}) {
  try {
    const api = new AccountApi();
    const response = yield call(api.login, email, password);

    yield put({
      type: types.SET_SITE_MEMBER,
      data: response.data
    });
  } catch (error) {
    deleteUser();
    yield put({ type: types.LOGIN_ERROR, error });
  }
}

/**
 * Login to user account using facebook google or other third parties
 *
 *
 * @param email
 * @param firstName
 * @param lastName
 * @param id
 * @param profilePicURL
 * @param accessToken
 * @param idToken
 * @param _provider
 * @param pathname
 */
function* loginOrRegisterThirdParty({
  values: {
    _profile: { email, firstName, lastName, id, profilePicURL } = {},
    _token: { accessToken, idToken },
    _provider
  },
  pathname
} = {}) {
  try {
    const provider = _provider;
    const api = new AccountApi();
    const response = yield call(
      api.loginOrRegisterThirdParty,
      email,
      firstName,
      lastName,
      id,
      profilePicURL,
      provider,
      accessToken,
      idToken
    );

    const { newUser } = response.data;

    // @TODO What needs to go to registered?
    if (newUser) {
      yield put({
        type: types.SET_REGISTERED,
        values: response
      });
    }

    yield put({
      type: types.SET_SITE_MEMBER,
      data: response.data,
      pathname
    });
  } catch (error) {
    deleteUser();
    yield put({ type: types.LOGIN_ERROR, error });
  }
}

/**
 * Logs out of an account
 *
 * @param operation
 */
function* logout({ operation }) {
  try {
    deleteUser();
    switch (operation) {
      case "reload_page":
        Router.pushRoute("/");
        yield put({
          type: pageTypes.CLOSE_OVERLAY
        });
        break;
      default:
        break;
    }
  } catch (error) {
    yield put({
      type: types.LOCAL_STORAGE_ERROR,
      error
    });
  }
}

/**
 * Register for a new account
 *
 * @param register
 * @param pathname
 */

function* registerUser({ register, pathname }) {
  try {
    const { email, password } = register;
    const api = new AccountApi();
    const registered = yield call(api.createUser, register);

    yield put({
      type: types.SET_REGISTERED,
      values: registered
    });

    yield put({
      type: types.LOGIN,
      login: {
        email,
        password
      },
      pathname
    });
  } catch (error) {
    yield put({ type: types.REGISTER_ERROR, error });
  }
}

function* setSiteMember({ data, pathname = "/" }) {
  try {
    const { token } = deepMapKeys(data, key => _.camelCase(key));
    setUserToken(token);
    Router.pushRoute(pathname);
    yield put({ type: types.LOAD_USER, values: {} });
    yield put({
      type: pageTypes.CLOSE_OVERLAY
    });
  } catch (error) {
    yield put({
      type: types.LOCAL_STORAGE_ERROR,
      error
    });
    return;
  }

  yield put({
    type: types.SET_LOGIN,
    values: {}
  });
}

function* sendContactEmail({ email, values }) {
  try {
    let message = "";
    _.keys(values).forEach(key => {
      message += `${key}: ${values[key]} <br/>`;
    });

    sendUserEmail({
      to: email || process.env.GATSBY_CONTACT_EMAIL || "test@ytadvisors.com",
      subject: `New contact email from ${values.email}`,
      message
    });

    yield put({
      type: formTypes.RESET_CONTACT_VALUES,
      message
    });
  } catch (error) {
    yield put({ type: types.EMAIL_ERROR, error });
  }
}

/*-----------------
 *
 * UPDATE OPERATIONS
 *
 *------------------*/

function* handleErrors({
  error: { response: { data: { code, message } = {} } = {} }
}) {
  if (message) {
    switch (code) {
      case "[jwt_auth] invalid_email":
      case "[jwt_auth] incorrect_password":
      case "login_error":
        yield put({
          type: "@@redux-form/STOP_SUBMIT",
          payload: {
            email: message,
            _error: "Sign in failed!"
          },
          meta: {
            form: "user"
          },
          error: true
        });
        break;
      case "payment_error":
        yield put({
          type: "@@redux-form/STOP_SUBMIT",
          payload: {
            stripe_card: "Invalid Credit Card",
            _error: "Payment Failure"
          },
          meta: {
            form: "user"
          },
          error: true
        });
        break;
      case "existing_user":
        yield put({
          type: "@@redux-form/STOP_SUBMIT",
          payload: {
            email: "Email already exists",
            _error: "Registration failed!"
          },
          meta: {
            form: "user"
          },
          error: true
        });
        break;
      case "jwt_auth_invalid_token":
        yield put({
          type: types.LOGOUT,
          operation: "reload_page"
        });
        break;
      default:
        break;
    }
  }
}

export default function* rootSaga() {
  yield all([
    yield takeLatest(types.LOAD_ERROR, handleErrors),
    yield takeLatest(types.LOGIN_ERROR, handleErrors),
    yield takeLatest(types.REGISTER_ERROR, handleErrors),
    yield takeLatest(types.SEND_CONTACT_EMAIL, sendContactEmail),
    yield takeLatest(types.LOGIN, login),
    yield takeLatest(types.LOGIN_THIRD_PARTY, loginOrRegisterThirdParty),
    yield takeLatest(types.LOGOUT, logout),
    yield takeLatest(types.REGISTER, registerUser),
    yield takeLatest(types.SET_SITE_MEMBER, setSiteMember)
  ]);
}
