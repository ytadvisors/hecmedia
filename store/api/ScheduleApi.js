import MainApi from "./index";

export default class ScheduleApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getAllSchedules = (page = 1, perPage) =>
    this.jsonApi.get(`schedules?perPage=${perPage}&page=${page}`);

  getScheduleByDay = day => this.jsonApi.get(`schedules?day=${day}`);

  getSchedule = scheduleId => this.jsonApi.get(`schedules/${scheduleId}`);
}
