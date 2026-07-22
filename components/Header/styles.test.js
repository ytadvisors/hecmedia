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
      "font-size: clamp(14px, calc(13px + 0.25vw), 17px);"
    );
    expect(headerStyles).toContain(
      "font-size: clamp(13px, calc(12px + 0.2vw), 14px);"
    );
  });

  it("keeps header text readable at the collapsed-navigation viewport", () => {
    expect(responsiveStyles).toContain(".brand-details {");
    expect(responsiveStyles).toContain("font-size: 13px;");
    expect(responsiveStyles).toContain("font-size: 14px;");
  });

  it("does not change the established logo dimensions", () => {
    expect(headerStyles).toContain("width: 165px;");
    expect(responsiveStyles).toContain("width: 120px;");
  });

  it("keeps tablet and mobile controls inside reserved header space", () => {
    expect(responsiveStyles).toContain("min-height: 112px;");
    expect(responsiveStyles).toContain("top: 54px;");
    expect(responsiveStyles).toContain("min-height: 142px;");
    expect(responsiveStyles).toContain("top: 91px;");
  });
});
