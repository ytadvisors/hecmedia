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

  it("keeps the mobile logo proportional and CTA links compact", () => {
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    expect(mobileBreakpoint).toBeGreaterThanOrEqual(0);

    const mobileStyles = headerStyles.slice(mobileBreakpoint);

    expect(mobileStyles).toContain("width: 58px;");
    expect(mobileStyles).toContain("max-width: none;");
    expect(mobileStyles).toContain("height: auto;");
    expect(mobileStyles).toContain("flex: 0 0 auto;");
    expect(mobileStyles).toContain("min-height: 24px;");
    expect(mobileStyles).toContain("padding: 3px 5px;");
  });

  it("stacks mobile social icons below the logo and left-aligns CTA buttons", () => {
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    const narrowBreakpoint = headerStyles.indexOf("@media (max-width: 400px)");
    expect(mobileBreakpoint).toBeGreaterThanOrEqual(0);
    expect(narrowBreakpoint).toBeGreaterThan(mobileBreakpoint);

    const mobileStyles = headerStyles.slice(mobileBreakpoint, narrowBreakpoint);
    expect(mobileStyles).toContain("grid-template-columns: 58px minmax(0, 1fr);");
    expect(mobileStyles).toContain(".header-secondary-row .social-links");
    expect(mobileStyles).toContain("grid-column: 1;");
    expect(mobileStyles).toContain("grid-row: 2;");
    expect(mobileStyles).toContain("justify-content: flex-start;");
    expect(mobileStyles).toContain(".top-bar-actions {");
    expect(mobileStyles).toContain("grid-column: 2;");

    const narrowStyles = headerStyles.slice(narrowBreakpoint);
    expect(narrowStyles).not.toContain("display: none;");
    expect(narrowStyles).toContain("display: flex;");
  });

  it("uses full-width mobile navigation and a viewport-aligned search panel", () => {
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    expect(mobileBreakpoint).toBeGreaterThanOrEqual(0);

    const mobileStyles = headerStyles.slice(mobileBreakpoint);
    expect(mobileStyles).toContain("position: fixed !important;");
    expect(mobileStyles).toContain("right: 12px !important;");
    expect(mobileStyles).toContain("left: 12px;");
    expect(mobileStyles).toContain("width: auto !important;");
    expect(mobileStyles).toContain("padding-right: 0;");
    expect(mobileStyles).toContain("display: block;");
    expect(mobileStyles).toContain("width: 100%;");
    expect(mobileStyles).toContain("left: 0;");
    expect(mobileStyles).toContain("float: none;");
  });

  it("allows desktop dropdown menus to escape the rounded navigation", () => {
    expect(headerStyles).toContain("overflow: visible;");
    expect(headerStyles).not.toContain("overflow: hidden;");
  });
});
