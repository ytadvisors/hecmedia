import fs from "fs";
import path from "path";
import { HOME_FEED_MOBILE_MAX_WIDTH } from "../../lib/homeFeedResponsive";

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");
const trendingStyles = fs.readFileSync(
  path.join(__dirname, "../TrendingNow/styles.scss"),
  "utf8"
);
const spotlightStyles = fs.readFileSync(
  path.join(__dirname, "../ListOfFeaturedPosts/styles.scss"),
  "utf8"
);

describe("ProgramViewer responsive ordering", () => {
  it("separates the Trending Now and Spotlight blocks with top borders", () => {
    expect(styles).toMatch(
      /\.program-viewer-trending,\s*\.program-viewer-spotlight\s*\{\s*border-top: 1px solid #0065bc;\s*\}/
    );
  });

  it("uses one responsive thumbnail size for Trending Now and Spotlight", () => {
    expect(styles).toContain("--rail-thumbnail-height: 64px;");
    expect(styles).toContain("--rail-thumbnail-width: 96px;");
    expect(styles).toContain(
      `@media (max-width: ${HOME_FEED_MOBILE_MAX_WIDTH}px)`
    );
    expect(styles).toMatch(
      /--rail-thumbnail-height: 72px;[\s\S]*--rail-thumbnail-width: 112px;/
    );
    expect(trendingStyles).toContain(
      "width: var(--rail-thumbnail-width, 96px);"
    );
    expect(trendingStyles).toContain(
      "height: var(--rail-thumbnail-height, 64px);"
    );
    expect(spotlightStyles).toContain(
      "width: var(--rail-thumbnail-width, 96px);"
    );
    expect(spotlightStyles).toContain(
      "height: var(--rail-thumbnail-height, 64px);"
    );
  });

  it("places promo and trending before the feed and Spotlight after it on mobile", () => {
    expect(styles).toMatch(/@media \(max-width: 991px\)/);
    expect(styles).toMatch(
      /\.program-viewer-row--rail-first-mobile[\s\S]*display: flex;[\s\S]*flex-direction: column;/
    );
    expect(styles).toMatch(/\.rail-promo\s*\{\s*order: 1;/);
    expect(styles).toMatch(/\.program-viewer-trending\s*\{\s*order: 2;/);
    expect(styles).toMatch(/\.program-viewer-main\s*\{\s*order: 3;/);
    expect(styles).toMatch(/\.program-viewer-spotlight\s*\{\s*order: 4;/);
  });
});
