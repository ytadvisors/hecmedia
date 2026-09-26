import {
  HOME_FEED_MOBILE_MAX_WIDTH,
  isHomeFeedMobileWidth
} from "./homeFeedResponsive";

describe("homepage feed responsive breakpoint", () => {
  it.each([500, 501, 600, 768, 769])(
    "uses the mobile layout at %ipx",
    width => {
      expect(isHomeFeedMobileWidth(width)).toBe(true);
    }
  );

  it("switches to the desktop layout above 769px", () => {
    expect(HOME_FEED_MOBILE_MAX_WIDTH).toBe(769);
    expect(isHomeFeedMobileWidth(770)).toBe(false);
  });
});
