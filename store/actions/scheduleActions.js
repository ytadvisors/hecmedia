import * as types from "../types/scheduleTypes";

export const loadScheduleAction = scheduleId => ({
  type: types.LOAD_SCHEDULE,
  scheduleId
});

export const loadScheduleByDayAction = day => ({
  type: types.LOAD_DAILY_SCHEDULE,
  day
});

export const loadAllSchedulesAction = (
  page,
  loadMore = false,
  perPage = 12
) => ({
  type: types.LOAD_ALL_SCHEDULES,
  page,
  perPage,
  loadMore
});
