import * as types from "../types/postTypes";
import postActions, { setPlayingLiveAction } from "./postActions";

describe("postActions", () => {
  it("creates a set-playing-live action", () => {
    expect(setPlayingLiveAction({ id: "1" })).toEqual({
      type: types.SET_PLAYING_LIVE,
      playingLive: { id: "1" }
    });
  });

  it("exports a no-op default", () => {
    expect(postActions()).toBeUndefined();
  });
});
