import * as types from "../types/formTypes";
import {
  loadUserValues,
  loadAboutValues,
  loadScheduleValues,
  loadContactValues
} from "./formActions";

describe("formActions", () => {
  it("creates a load-user-values action", () => {
    expect(loadUserValues({ email: "a@b.com" })).toEqual({
      type: types.LOAD_USER_VALUES,
      values: { email: "a@b.com" }
    });
  });

  it("creates a load-about-values action", () => {
    expect(loadAboutValues({ country: "US" })).toEqual({
      type: types.LOAD_ABOUT_VALUES,
      values: { country: "US" }
    });
  });

  it("creates a load-schedule-values action", () => {
    expect(loadScheduleValues({ day: "monday" })).toEqual({
      type: types.LOAD_SCHEDULE_VALUES,
      values: { day: "monday" }
    });
  });

  it("creates a load-contact-values action", () => {
    expect(loadContactValues({ message: "hi" })).toEqual({
      type: types.LOAD_CONTACT_VALUES,
      values: { message: "hi" }
    });
  });
});
