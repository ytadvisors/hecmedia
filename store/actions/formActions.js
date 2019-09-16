import * as types from "../types/formTypes";

export const loadUserValues = values => ({
  type: types.LOAD_USER_VALUES,
  values
});

export const loadAboutValues = values => ({
  type: types.LOAD_ABOUT_VALUES,
  values
});

export const loadScheduleValues = values => ({
  type: types.LOAD_SCHEDULE_VALUES,
  values
});

export const loadContactValues = values => ({
  type: types.LOAD_CONTACT_VALUES,
  values
});
