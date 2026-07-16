import * as types from "../types/accountTypes";
import {
  loginAction,
  registerAction,
  loginThirdPartyAction,
  logoutAction,
  sendContactEmail,
  sendEmail
} from "./accountActions";

describe("accountActions", () => {
  it("creates a login action", () => {
    expect(loginAction({ email: "a@b.com" })).toEqual({
      type: types.LOGIN,
      login: { email: "a@b.com" }
    });
  });

  it("creates a register action", () => {
    expect(registerAction({ email: "a@b.com" })).toEqual({
      type: types.REGISTER,
      register: { email: "a@b.com" }
    });
  });

  it("creates a third-party login action", () => {
    expect(loginThirdPartyAction({ provider: "google" })).toEqual({
      type: types.LOGIN_THIRD_PARTY,
      values: { provider: "google" }
    });
  });

  it("creates a logout action", () => {
    expect(logoutAction("manual")).toEqual({
      type: types.LOGOUT,
      operation: "manual"
    });
  });

  it("creates a send-contact-email action", () => {
    expect(sendContactEmail({ message: "hi" })).toEqual({
      type: types.SEND_CONTACT_EMAIL,
      values: { message: "hi" }
    });
  });

  it("creates a send-email action", () => {
    expect(sendEmail("a@b.com", { subject: "hi" })).toEqual({
      type: types.SEND_EMAIL,
      email: "a@b.com",
      values: { subject: "hi" }
    });
  });
});
