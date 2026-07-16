import axios from "axios";
import ScheduleApi from "./ScheduleApi";

jest.mock("axios");

describe("ScheduleApi", () => {
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    jsonApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    axios.create.mockImplementation(() => jsonApi);
    api = new ScheduleApi({ url: "https://hectv.org" });
  });

  it("gets a page of schedules", () => {
    api.getAllSchedules(1, 20);

    expect(jsonApi.get).toHaveBeenCalledWith("schedules?perPage=20&page=1");
  });

  it("gets a schedule by day", () => {
    api.getScheduleByDay("monday");

    expect(jsonApi.get).toHaveBeenCalledWith("schedules?day=monday");
  });

  it("gets a schedule by id", () => {
    api.getSchedule("11");

    expect(jsonApi.get).toHaveBeenCalledWith("schedules/11");
  });
});
