import fs from "fs";
import path from "path";

const sideNavigationStyles = fs.readFileSync(
  path.join(__dirname, "styles.scss"),
  "utf8"
);

describe("SideNavigation responsive promo artwork", () => {
  it("adds breathing room and preserves the full image on phones and tablets", () => {
    const responsiveStyles = sideNavigationStyles.slice(
      sideNavigationStyles.indexOf("@media (max-width: 991px)")
    );

    expect(responsiveStyles).toContain("padding-top: 12px;");
    expect(responsiveStyles).toContain("height: auto;");
    expect(responsiveStyles).toContain("object-fit: contain;");
  });
});
