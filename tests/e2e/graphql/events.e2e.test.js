import moment from "moment";
import {
  GET_EVENTS_CATEGORIES,
  GET_LIVE_VIDEOS,
  GET_CURRENT_EVENTS,
  GET_EVENTS_BY_DAY,
  GET_EVENT_INFO
} from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

describe("EventCategories (components/SubNavigation/EventNav.js)", () => {
  it("returns event categories for the event filter nav", async () => {
    const result = await executeQuery(GET_EVENTS_CATEGORIES, { limit: 5 });

    expect(result.errors).toBeUndefined();
    const { categories } = result.data;
    expect(Array.isArray(categories.edges)).toBe(true);
    categories.edges.forEach(({ node }) => {
      expect(typeof node.slug).toBe("string");
      expect(typeof node.name).toBe("string");
      expect(typeof node.eventCategoryId).toBe("number");
    });
  });
});

describe("LiveVideos (containers/Layout/index.js)", () => {
  it("returns currently-live video banners, keyed off the current time window", async () => {
    // Same variable construction as containers/Layout/index.js.
    const currentDate = moment()
      .format("YYYY-MM-DD HH:mm:ss")
      .toLowerCase();
    const result = await executeQuery(GET_LIVE_VIDEOS, {
      keyStart: "display_date",
      keyEnd: "end_date",
      compareStart: currentDate,
      compareEnd: currentDate
    });

    expect(result.errors).toBeUndefined();
    const { liveVideos } = result.data;
    expect(Array.isArray(liveVideos.edges)).toBe(true);
    liveVideos.edges.forEach(({ node }) => {
      expect(typeof node.title).toBe("string");
      if (node.temporaryLink !== null) {
        expect(typeof node.temporaryLink.url).toBe("string");
      }
    });
  });
});

describe("allEvents (components/ListOfEvents/index.js)", () => {
  it("returns upcoming events for the 'things to do' widget", async () => {
    // Same variable construction as components/ListOfEvents/index.js.
    const dayEnd = `${moment().format("YYYY-MM-DD")} 00:00:00`;
    const result = await executeQuery(GET_CURRENT_EVENTS, {
      keyEnd: "event_dates_$_end_time",
      dayEnd
    });

    expect(result.errors).toBeUndefined();
    const { currentEvents } = result.data;
    expect(Array.isArray(currentEvents.edges)).toBe(true);
    currentEvents.edges.forEach(({ node }) => {
      expect(typeof node.title).toBe("string");
      expect(typeof node.link).toBe("string");
    });
  });
});

describe("EventDayInfo (containers/_templates/events.js)", () => {
  it("returns events matching a day, plus feed design for the events page", async () => {
    // Same variable construction as containers/_templates/events.js.
    const dayEnd = `${moment().format("YYYY-MM-DD")} 00:00:00`;
    const result = await executeQuery(GET_EVENTS_BY_DAY, {
      keyEnd: "event_dates_$_end_time",
      dayEnd,
      cursor: ""
    });

    expect(result.errors).toBeUndefined();
    const { matchEvent, pageData } = result.data;
    expect(Array.isArray(matchEvent.nodes)).toBe(true);
    matchEvent.nodes.forEach(node => {
      expect(typeof node.title).toBe("string");
      expect(typeof node.eventId).toBe("number");
      expect(Array.isArray(node.eventDetails.eventDates)).toBe(true);
    });
    if (pageData !== null) {
      expect(typeof pageData.feedDesign).toBe("object");
    }
  });
});

describe("EventInfo (pages/events/[category]/index.js)", () => {
  it("resolves an event-category uri (nullable — not every uri matches)", async () => {
    const result = await executeQuery(GET_EVENT_INFO, { uri: "arts" });

    const { eventData } = result.data;
    if (eventData !== null) {
      expect(typeof eventData.title).toBe("string");
      expect(typeof eventData.link).toBe("string");
      expect(
        eventData.eventDetails.eventPosts === null ||
          typeof eventData.eventDetails.eventPosts === "object"
      ).toBe(true);
    }
  });
});
