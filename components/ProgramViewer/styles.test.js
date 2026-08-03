import fs from "fs";
import path from "path";

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");

describe("ProgramViewer responsive ordering", () => {
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
