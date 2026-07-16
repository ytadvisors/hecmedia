import reducer from "./formReducers";
import * as types from "../types/formTypes";

describe("formReducers", () => {
  it("clears password fields on LOGIN_FAIL", () => {
    const seeded = {
      user: {
        values: {
          password: "secret",
          confirm_password: "secret",
          email: "a@b.com"
        },
        fields: { password: {}, confirm_password: {} },
        saved: { password: "secret", confirm_password: "secret" }
      }
    };

    const result = reducer(seeded, { type: types.LOGIN_FAIL });

    expect(result.user.values.password).toBeUndefined();
    expect(result.user.values.confirm_password).toBeUndefined();
    expect(result.user.values.email).toBe("a@b.com");
  });

  it("merges user values on LOAD_USER_VALUES", () => {
    const result = reducer(undefined, {
      type: types.LOAD_USER_VALUES,
      values: { email: "a@b.com" }
    });

    expect(result.user.values).toEqual({ email: "a@b.com" });
  });

  it("merges schedule form values on LOAD_SCHEDULE_VALUES", () => {
    const result = reducer(undefined, {
      type: types.LOAD_SCHEDULE_VALUES,
      values: { day: "monday" }
    });

    expect(result.schedule.values).toEqual({ day: "monday" });
  });

  it("merges newsletter form values on LOAD_NEWSLETTER_VALUES", () => {
    const result = reducer(undefined, {
      type: types.LOAD_NEWSLETTER_VALUES,
      values: { email: "a@b.com" }
    });

    expect(result.newsletter.values).toEqual({ email: "a@b.com" });
  });

  it("merges and resets contact form values", () => {
    const loaded = reducer(undefined, {
      type: types.LOAD_CONTACT_VALUES,
      values: { message: "hi" }
    });

    expect(loaded.contact.values).toEqual({ message: "hi" });

    const reset = reducer(loaded, { type: types.RESET_CONTACT_VALUES });

    expect(reset.contact.values).toEqual({});
  });

  it("resets comment form values", () => {
    const result = reducer(undefined, { type: types.RESET_COMMENT_VALUES });

    expect(result.comment.values).toEqual({});
  });

  it("leaves the search slice untouched by unrelated actions", () => {
    const result = reducer(undefined, { type: "@@INIT" });

    expect(result.search.values).toEqual({});
  });
});
