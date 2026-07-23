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

  it("uses bounded desktop sizes for the tagline and primary navigation", () => {
    expect(headerStyles).toContain(
      "font-size: clamp(12px, calc(10px + 0.3vw), 15px);"
    );
    expect(headerStyles).toContain(
      "font-size: clamp(13px, calc(12px + 0.2vw), 14px);"
    );
  });

  it("keeps header text readable at the collapsed-navigation viewport", () => {
    expect(headerStyles).toContain(".brand-tagline {");
    expect(responsiveStyles).toContain("font-size: 14px;");
  });

  it("uses a compact logo with auto width", () => {
    expect(headerStyles).toContain("height: 40px;");
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
