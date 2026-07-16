import * as types from "../types/scheduleTypes";
import {
  loadScheduleAction,
  loadScheduleByDayAction,
  loadAllSchedulesAction
} from "./scheduleActions";

describe("scheduleActions", () => {
  it("creates a load-schedule action", () => {
    expect(loadScheduleAction("3")).toEqual({
      type: types.LOAD_SCHEDULE,
      scheduleId: "3"
    });
  });

  it("creates a load-schedule-by-day action", () => {
    expect(loadScheduleByDayAction("monday")).toEqual({
      type: types.LOAD_DAILY_SCHEDULE,
      day: "monday"
    });
  });

  it("creates a load-all-schedules action with defaults", () => {
    expect(loadAllSchedulesAction(2)).toEqual({
      type: types.LOAD_ALL_SCHEDULES,
      page: 2,
      perPage: 12,
      loadMore: false
    });
  });

  it("creates a load-all-schedules action with overrides", () => {
    expect(loadAllSchedulesAction(3, true, 6)).toEqual({
      type: types.LOAD_ALL_SCHEDULES,
      page: 3,
      perPage: 6,
      loadMore: true
    });
  });
});
