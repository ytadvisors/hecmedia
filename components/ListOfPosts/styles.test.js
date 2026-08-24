import fs from "fs";
import path from "path";
import { HOME_FEED_MOBILE_MAX_WIDTH } from "../../lib/homeFeedResponsive";

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");

describe("ListOfPosts mobile styles", () => {
  it("keeps the Sass and JavaScript breakpoints aligned through 769px", () => {
    expect(styles).toContain(
      `$home-feed-mobile-max-width: ${HOME_FEED_MOBILE_MAX_WIDTH}px;`
    );
    expect(styles).not.toMatch(/@media \(max-width: (500|767)px\)/);
  });

  it("removes the mobile card box and wraps taxonomy labels at word boundaries", () => {
    expect(styles).toMatch(
      /@media \(max-width: \$home-feed-mobile-max-width\)[\s\S]*\.main-col\s*\{[\s\S]*background: transparent;[\s\S]*border-radius: 0;/
    );
    expect(styles).toMatch(
      /@media \(max-width: \$home-feed-mobile-max-width\)[\s\S]*\.main-col \.blog-excerpt \.category-info\s*\{[\s\S]*overflow-wrap: anywhere;[\s\S]*word-break: normal;/
    );
  });
});
