import React from "react";
import { render } from "@testing-library/react";
import moment from "moment";
import {
  getHref,
  getSocialIcon,
  getExcerpt,
  getNumAPIResults,
  getHeaderMenuObject,
  getSocialMenuObject,
  getPosts,
  getPostImgSrc,
  getEventDate,
  getCurrentEvents,
  getCurrentPrograms,
  getPrograms,
  getFormattedDate
} from "./getFunctions";

describe("getHref", () => {
  it("returns the first route page for a two-segment link", () => {
    expect(getHref("category/123")).toBe("/category/[pid]/");
  });

  it("returns the route matching the param count for a longer link", () => {
    expect(getHref("category/123/456")).toBe("/category/[pid]/[id]/");
  });

  it("uses a truthy given index over the derived param count", () => {
    expect(getHref("category/123", 2)).toBe("/category/[pid]/[id]/[cid]/");
  });

  it("ignores an explicit index of 0 and falls back to the derived param count", () => {
    // `index || numParams` treats 0 as falsy, so it can't select the first route
    // via an explicit index — this locks in that real (if surprising) behavior.
    expect(getHref("category/123/456", 0)).toBe("/category/[pid]/[id]/");
  });

  it("falls back to the first route entry when the requested index is out of range", () => {
    expect(getHref("category/123/456/789/999")).toBe("/category/[pid]/");
  });

  it("falls back to the catch-all route for an unknown key", () => {
    expect(getHref("unknown/123")).toBe("/[page]/");
  });

  it("returns an empty string for falsy input", () => {
    expect(getHref("")).toBe("");
  });
});

describe("getSocialIcon", () => {
  it.each(["facebook", "twitter", "youtube", "instagram"])(
    "renders an icon for %s",
    title => {
      const { container } = render(<>{getSocialIcon(title)}</>);

      expect(container.querySelector("svg")).not.toBeNull();
    }
  );

  it("is case-insensitive", () => {
    const { container } = render(<>{getSocialIcon("FACEBOOK")}</>);

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("returns an empty string for an unknown network", () => {
    expect(getSocialIcon("myspace")).toBe("");
  });
});

describe("getExcerpt", () => {
  it("truncates long text and strips tags", () => {
    const long = `<p>${"a".repeat(210)}</p>`;

    expect(getExcerpt(long, 10)).toBe(`${"a".repeat(10)}...`);
  });

  it("returns short text unchanged apart from tags", () => {
    expect(getExcerpt("<p>short</p>")).toBe("short");
  });
});

describe("getNumAPIResults", () => {
  it("reads the total count from the x-wp-total header", () => {
    expect(getNumAPIResults({ headers: { "x-wp-total": "42" } })).toBe(42);
  });

  it("returns 0 when the header is missing", () => {
    expect(getNumAPIResults({ headers: {} })).toBe(0);
    expect(getNumAPIResults({})).toBe(0);
  });
});

describe("getHeaderMenuObject", () => {
  it("returns an empty array when there are no menus", () => {
    expect(getHeaderMenuObject(null)).toEqual([]);
  });

  it("maps a flat menu with no children", () => {
    const menus = [{ node: { label: "Home", url: "/", childItems: null } }];

    const result = getHeaderMenuObject(menus);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: "Home", url: "/" });
    expect(result[0].icon).toBeFalsy();
    expect(result[0].children).toBeFalsy();
  });

  it("recurses into child items", () => {
    const menus = [
      {
        node: {
          label: "Parent",
          url: "/parent",
          childItems: {
            edges: [{ node: { label: "Child", url: "/parent/child" } }]
          }
        }
      }
    ];

    const result = getHeaderMenuObject(menus);

    expect(result[0].icon).toBeTruthy();
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0]).toMatchObject({ label: "Child" });
  });
});

describe("getSocialMenuObject", () => {
  it("returns an empty array when there are no menus", () => {
    expect(getSocialMenuObject(null)).toEqual([]);
  });

  it("maps each menu entry to a link with its social icon", () => {
    const menus = [{ node: { label: "Facebook", url: "https://fb.example" } }];

    const result = getSocialMenuObject(menus, 20, "#000");

    expect(result[0]).toMatchObject({
      label: "Facebook",
      link: "https://fb.example"
    });
  });
});

describe("getPosts", () => {
  it("reads posts out of the acf field and applies title/excerpt aliases", () => {
    const data = {
      0: {
        acf: {
          featured: [
            { post: { postTitle: "Hello", postExcerpt: "World", slug: "a" } }
          ]
        }
      }
    };

    const result = getPosts(data, 0, "featured", "post");

    expect(result).toEqual([
      {
        slug: "a",
        postTitle: "Hello",
        postExcerpt: "World",
        title: "Hello",
        excerpt: "World"
      }
    ]);
  });

  it("appends nodes from the extra index and filters out empty entries", () => {
    const data = {
      0: { acf: { featured: [{ post: null }] } },
      1: { edges: [{ node: { slug: "b" } }] }
    };

    const result = getPosts(data, 0, "featured", "post", 1);

    expect(result).toEqual([{ slug: "b" }]);
  });
});

describe("getPostImgSrc", () => {
  it("prefers an external image when present", () => {
    const post = {
      eventDetails: { externalImage: "https://ext.example/e.jpg" }
    };

    expect(getPostImgSrc(post)).toBe("https://ext.example/e.jpg");
  });

  it("returns the medium image for type=small", () => {
    const post = {
      postDetails: { postHeader: { medium: "med.jpg", large: "lg.jpg" } }
    };

    expect(getPostImgSrc(post, "small")).toBe("med.jpg");
  });

  it("returns the large image by default, preferring videoImage first", () => {
    const post = {
      postDetails: {
        videoImage: { large: "video-lg.jpg" },
        postHeader: { large: "header-lg.jpg" }
      }
    };

    expect(getPostImgSrc(post)).toBe("video-lg.jpg");
  });

  it("handles a missing post gracefully", () => {
    expect(getPostImgSrc()).toBeUndefined();
  });
});

describe("getEventDate", () => {
  it("formats a single-day event once", () => {
    const result = getEventDate([
      { startTime: "06/01/2026 10:00 am", endTime: "06/01/2026 10:00 am" }
    ]);

    expect(result).toEqual([" Jun 01"]);
  });

  it("includes the year when the event spans into an earlier month than it started", () => {
    const result = getEventDate([
      { startTime: "12/30/2026 10:00 am", endTime: "01/02/2027 10:00 am" }
    ]);

    expect(result).toEqual([" Dec 30, 2026 - Jan 02, 2027"]);
  });

  it("skips entries with unparsable dates", () => {
    expect(
      getEventDate([{ startTime: "not-a-date", endTime: "not-a-date" }])
    ).toEqual([]);
  });
});

describe("getCurrentEvents", () => {
  it("includes events whose date range spans the current day", () => {
    const currentDay = moment("2026-06-15", "YYYY-MM-DD");
    const events = [
      {
        node: {
          slug: "in-range",
          acf: {
            eventDates: [{ startTime: "06/10/2026", endTime: "06/20/2026" }]
          }
        }
      },
      {
        node: {
          slug: "out-of-range",
          acf: {
            eventDates: [{ startTime: "01/01/2026", endTime: "01/05/2026" }]
          }
        }
      }
    ];

    const result = getCurrentEvents(currentDay, events);

    expect(Object.keys(result.values)).toEqual(["in-range"]);
    expect(result.started).toBe(1);
  });

  it("stops adding once numEntries is reached", () => {
    const currentDay = moment("2026-06-15", "YYYY-MM-DD");
    const events = [
      {
        node: {
          slug: "first",
          acf: {
            eventDates: [{ startTime: "06/10/2026", endTime: "06/20/2026" }]
          }
        }
      },
      {
        node: {
          slug: "second",
          acf: {
            eventDates: [{ startTime: "06/10/2026", endTime: "06/20/2026" }]
          }
        }
      }
    ];

    const result = getCurrentEvents(currentDay, events, 1);

    expect(result.started).toBe(1);
  });
});

describe("getCurrentPrograms", () => {
  it("returns an empty object when there are no programs", () => {
    expect(getCurrentPrograms([], 5)).toEqual({});
  });

  it("includes programs that have not yet ended", () => {
    const programs = [
      { programStartDate: "01/01/2099", programEndTime: "11:59 pm" }
    ];

    const result = getCurrentPrograms(programs, 5);

    expect(result.values).toHaveLength(1);
    expect(result.started).toBe(1);
  });
});

describe("getPrograms", () => {
  it("returns an empty array when there are no schedules", () => {
    expect(getPrograms(null, 5)).toEqual([]);
  });

  it("finds the schedule matching the current month and delegates to getCurrentPrograms", () => {
    const day = moment(new Date())
      .format("MMMM-YYYY")
      .toLowerCase();
    const schedules = [
      {
        node: {
          slug: day,
          acf: {
            schedulePrograms: [
              { programStartDate: "01/01/2099", programEndTime: "11:59 pm" }
            ]
          }
        }
      }
    ];

    const result = getPrograms(schedules, 5);

    expect(result.values).toHaveLength(1);
  });

  it("returns no started programs when no schedule matches the current month", () => {
    const schedules = [
      { node: { slug: "not-this-month", acf: { schedulePrograms: [] } } }
    ];

    const result = getPrograms(schedules, 5);

    expect(result).toEqual({});
  });
});

describe("getFormattedDate", () => {
  it("pads single-digit month and day", () => {
    expect(getFormattedDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("does not pad double-digit month and day", () => {
    expect(getFormattedDate(new Date(2026, 10, 25))).toBe("2026-11-25");
  });
});
