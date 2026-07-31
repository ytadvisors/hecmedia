import fs from "fs";
import path from "path";

const sideNavigationStyles = fs.readFileSync(
  path.join(__dirname, "styles.scss"),
  "utf8"
);

describe("SideNavigation responsive promo artwork", () => {
  it("adds top breathing room at every viewport", () => {
    const baseStyles = sideNavigationStyles.slice(
      0,
      sideNavigationStyles.indexOf("@media (max-width: 991px)")
    );

    expect(baseStyles).toContain("padding-top: 12px;");
  });

  it("preserves the full image on phones and tablets", () => {
    const responsiveStyles = sideNavigationStyles.slice(
      sideNavigationStyles.indexOf("@media (max-width: 991px)")
    );

    expect(responsiveStyles).toContain("height: auto;");
    expect(responsiveStyles).toContain("object-fit: contain;");
  });
});
