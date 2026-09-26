import moment from "moment";
import { GET_LIVE_VIDEOS } from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

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
