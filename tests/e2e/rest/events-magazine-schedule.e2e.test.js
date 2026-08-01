import ScheduleApi from "../../../store/api/ScheduleApi";
import PageApi from "../../../store/api/PageApi";
import { REST_HOST } from "../support/config";

const scheduleApi = new ScheduleApi({ url: REST_HOST });
const pageApi = new PageApi({ url: REST_HOST });

describe("ScheduleApi (store/api/ScheduleApi.js)", () => {
  it("getAllSchedules returns a list of schedule entries", async () => {
    const res = await scheduleApi.getAllSchedules(1, 5);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("getScheduleByDay returns a (possibly empty) list for today", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await scheduleApi.getScheduleByDay(today);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

describe("PageApi (store/api/PageApi.js)", () => {
  it("getPage resolves the about-us page", async () => {
    const res = await pageApi.getPage("about-us");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("getMenus returns the site's WP nav menus", async () => {
    const res = await pageApi.getMenus();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    res.data.forEach(menu => {
      expect(typeof menu.name).toBe("string");
      expect(typeof menu.slug).toBe("string");
    });
  });
});
