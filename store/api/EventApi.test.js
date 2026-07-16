import axios from "axios";
import EventApi from "./EventApi";

jest.mock("axios");

describe("EventApi", () => {
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    jsonApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    axios.create.mockImplementation(() => jsonApi);
    api = new EventApi({ url: "https://hectv.org" });
  });

  it("gets event types by category slugs", () => {
    api.getEventType(["music", "faith"]);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "eventCategory?slug[]=music&slug[]=faith"
    );
  });

  it("gets all events with no filters", () => {
    api.getAllEvents([], "", 1, 12);

    expect(jsonApi.get).toHaveBeenCalledWith("event?perPage=12&page=1");
  });

  it("gets all events filtered by type and day", () => {
    api.getAllEvents(["music"], "monday", 2, 12);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "event?perPage=12&page=2&eventCategory[]=music&day=monday"
    );
  });

  it("gets events by slugs", () => {
    api.getEventsBySlugs(["a", "b"]);

    expect(jsonApi.get).toHaveBeenCalledWith("event?slug[]=a&slug[]=b");
  });

  it("gets an event by slug", () => {
    api.getEventBySlug("summer-fest");

    expect(jsonApi.get).toHaveBeenCalledWith("event?slug=summer-fest");
  });

  it("gets an event by id", () => {
    api.getEvent("99");

    expect(jsonApi.get).toHaveBeenCalledWith("event/99");
  });

  it("gets event categories", () => {
    api.getEventCategories(3);

    expect(jsonApi.get).toHaveBeenCalledWith("eventCategory?page=3");
  });
});
