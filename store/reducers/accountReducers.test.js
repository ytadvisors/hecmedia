import reducer from "./accountReducers";
import * as types from "../types/accountTypes";

describe("accountReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state).toEqual({
      user: { token: "" },
      about: { country: "US" },
      error: false
    });
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { user: {}, about: {}, error: true },
      { type: types.LOGIN }
    );

    expect(state.error).toBe(false);
  });

  it("saves user information", () => {
    const state = reducer(undefined, {
      type: types.SAVE_USER_INFORMATION,
      values: { email: "a@b.com" }
    });

    expect(state.user).toEqual({ email: "a@b.com" });
  });

  it("saves about information", () => {
    const state = reducer(undefined, {
      type: types.SAVE_ABOUT_INFORMATION,
      values: { country: "CA" }
    });

    expect(state.about).toEqual({ country: "CA" });
  });

  it("merges user values on SET_USER and SET_LOGIN", () => {
    const state = reducer(undefined, {
      type: types.SET_USER,
      values: { token: "abc" }
    });

    expect(state.user).toEqual({ token: "abc" });
  });

  it("resets user and about state on logout", () => {
    const state = reducer(
      { user: { token: "abc" }, about: { country: "CA" }, error: false },
      { type: types.LOGOUT }
    );

    expect(state.user).toEqual({ token: "" });
    expect(state.about).toEqual({ country: "US" });
  });

  it.each([
    types.LOAD_ERROR,
    types.LOGIN_ERROR,
    types.REGISTER_ERROR,
    types.EMAIL_ERROR
  ])("sets the error flag on %s", type => {
    const state = reducer(undefined, { type });

    expect(state.error).toBe(true);
  });
});
