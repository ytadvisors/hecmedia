import fs from "fs";
import path from "path";

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");

describe("article header image sizing styles", () => {
  it("keeps a small header image readable on mobile", () => {
    const mobileStyles = styles.slice(
      styles.indexOf("@media (max-width: 767px)")
    );

    expect(mobileStyles).toContain('[data-header-image-size="small"]');
    expect(mobileStyles).toContain("width: 60%;");
  });
});
