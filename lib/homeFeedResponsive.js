/**
 * The homepage feed stays in its mobile layout through 769px, inclusive.
 * Keep the matching Sass breakpoint covered by ListOfPosts/styles.test.js.
 */
export const HOME_FEED_MOBILE_MAX_WIDTH = 769;

export const isHomeFeedMobileWidth = width =>
  Number(width) <= HOME_FEED_MOBILE_MAX_WIDTH;
