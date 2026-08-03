import fs from "fs";
import path from "path";

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");

describe("ListOfPosts mobile styles", () => {
  it("removes the mobile card box and wraps taxonomy labels at word boundaries", () => {
    expect(styles).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.main-col\s*\{[\s\S]*background: transparent;[\s\S]*border-radius: 0;/
    );
    expect(styles).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.main-col \.blog-excerpt \.category-info\s*\{[\s\S]*overflow-wrap: anywhere;[\s\S]*word-break: normal;/
    );
  });
});
