import fs from "fs";
import path from "path";

const headerStyles = fs.readFileSync(
  path.join(__dirname, "styles.scss"),
  "utf8"
);

describe("Header responsive typography", () => {
  const responsiveStyles = headerStyles.slice(
    headerStyles.indexOf("@media (max-width: 1170px)")
  );

  it("uses the compact mock typography for the tagline and bounded navigation", () => {
    expect(headerStyles).toContain("font-size: 12px;");
    expect(headerStyles).toContain("text-transform: uppercase;");
    expect(headerStyles).toContain(
      "font-size: clamp(13px, calc(12px + 0.2vw), 14px);"
    );
  });

  it("hides company copy at the collapsed-navigation viewport", () => {
    expect(headerStyles).toContain(".brand-tagline {");
    expect(responsiveStyles).toContain("display: none;");
  });

  it("uses the larger desktop mock logo with auto width", () => {
    expect(headerStyles).toContain("height: 66px;");
    expect(headerStyles).toContain("width: auto;");
  });

  it("keeps tablet and mobile controls inside header-top-row flex flow", () => {
    // No absolute offsets that pull toggle or search out of the top-row flex container
    expect(responsiveStyles).not.toContain("top: 54px;");
    expect(responsiveStyles).not.toContain("top: 48px;");
    // No fixed min-heights needed to reserve space for the old absolute-positioned layout
    expect(responsiveStyles).not.toContain("min-height: 112px;");
    expect(responsiveStyles).not.toContain("min-height: 142px;");
  });
});
