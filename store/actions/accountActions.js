import * as types from "../types/accountTypes";

// LOAD

// CREATE

// UPDATE
export const loginAction = login => ({
  type: types.LOGIN,
  login
});
export const registerAction = register => ({
  type: types.REGISTER,
  register
});

export const loginThirdPartyAction = values => ({
  type: types.LOGIN_THIRD_PARTY,
  values
});

export const logoutAction = operation => ({
  type: types.LOGOUT,
  operation
});

export const sendContactEmail = values => ({
  type: types.SEND_CONTACT_EMAIL,
  values
});

export const sendEmail = (email, values) => ({
  type: types.SEND_EMAIL,
  email,
  values
});

// UPDATE

// DELETE
