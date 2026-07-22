import fs from "fs";
import path from "path";

const headerStyles = fs.readFileSync(
  path.join(__dirname, "styles.scss"),
  "utf8"
);

describe("Header responsive typography", () => {
  it("uses bounded desktop sizes for the tagline and primary navigation", () => {
    expect(headerStyles).toContain(
      "font-size: clamp(12px, calc(10px + 0.3vw), 15px);"
    );
    expect(headerStyles).toContain(
      "font-size: clamp(13px, calc(12px + 0.2vw), 14px);"
    );
  });

  it("keeps the compact logo lockup on a single desktop line", () => {
    expect(headerStyles).toContain(".header-top-row {");
    expect(headerStyles).toContain("white-space: nowrap;");
    expect(headerStyles).toContain("@media (min-width: 1280px)");
  });

  it("makes the nav pill-shaped and keeps it out of full-bleed layout", () => {
    expect(headerStyles).toContain("display: inline-flex;");
    expect(headerStyles).toContain("border-radius: 999px;");
    expect(headerStyles).toContain("padding: 4px 12px 16px 0;");
  });

  it("keeps search in the normal top-row flow at tablet and mobile sizes", () => {
    const responsiveStyles = headerStyles.slice(
      headerStyles.indexOf("@media (max-width: 1170px)")
    );
    expect(responsiveStyles).toContain("position: static;");
    expect(responsiveStyles).not.toContain("top: 54px;");
    expect(responsiveStyles).not.toContain("top: 91px;");
  });
});
