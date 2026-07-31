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

  it("shows company copy beside the logo at the collapsed-navigation viewport", () => {
    expect(headerStyles).toContain(".brand-tagline {");
    expect(responsiveStyles).toContain("display: block;");
    expect(responsiveStyles).toContain("font-size: 11px;");
    expect(responsiveStyles).toContain("align-self: center;");
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
    const collapsedBreakpoint = headerStyles.indexOf(
      "@media (max-width: 1170px)"
    );
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    expect(collapsedBreakpoint).toBeGreaterThanOrEqual(0);
    expect(mobileBreakpoint).toBeGreaterThan(collapsedBreakpoint);

    const collapsedStyles = headerStyles.slice(
      collapsedBreakpoint,
      mobileBreakpoint
    );
    expect(collapsedStyles).toContain(
      "grid-template-columns: auto minmax(0, 1fr);"
    );
    expect(collapsedStyles).toContain(".header-secondary-row .social-links");
    expect(collapsedStyles).toContain("grid-column: 1;");
    expect(collapsedStyles).toContain("grid-row: 1;");
    expect(collapsedStyles).toContain("justify-content: flex-start;");
    expect(collapsedStyles).toContain(".top-bar-actions {");
    expect(collapsedStyles).toContain("grid-column: 2;");
    expect(collapsedStyles).toContain("grid-row: 2;");
    expect(collapsedStyles).toContain("align-self: start;");
    expect(collapsedStyles).toContain("margin-left: 0;");
  });

  it("vertically centers compact mobile header controls", () => {
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    const mobileStyles = headerStyles.slice(mobileBreakpoint);

    expect(mobileStyles).toContain("align-items: center;");
    expect(mobileStyles).toContain("padding-top: 0;");
    expect(mobileStyles).toContain("margin-top: 0;");
    expect(mobileStyles).toContain("margin-right: 0;");
    expect(mobileStyles).toContain("margin-left: 0;");
    expect(mobileStyles).toContain("padding: 0 !important;");
    expect(mobileStyles).toContain("width: 38px;");
    expect(mobileStyles).toContain("height: 38px;");
    expect(mobileStyles).toContain("width: 18px;");
    expect(mobileStyles).toContain("height: 18px;");
  });

  it("paints collapsed-nav dropdown and nested submenu panels brand blue, not Bootstrap white", () => {
    const tabletBreakpoint = headerStyles.indexOf("@media (max-width: 1170px)");
    expect(tabletBreakpoint).toBeGreaterThanOrEqual(0);
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    const tabletStyles = headerStyles.slice(tabletBreakpoint, mobileBreakpoint);
    expect(tabletStyles).toContain(".bottom-nav {");
    expect(tabletStyles).toContain("ul.top-navigation {");
    expect(tabletStyles).toContain("position: absolute;");
    expect(tabletStyles).toContain("top: 100%;");
    expect(tabletStyles).toContain("max-height: calc(100vh - 71px);");
    expect(tabletStyles).toContain("overflow-y: auto;");
    expect(tabletStyles).not.toContain(".bottom-nav {\n      .nav-tabs {");

    // First-level mobile dropdown panel
    expect(tabletStyles).toContain("background: #0065bc;");
    expect(tabletStyles).toContain("background-color: #0065bc;");
    // Nested second dropdown must not fall through to Bootstrap's white default
    expect(tabletStyles).toMatch(
      /\.dropdown-menu\s*\{[^}]*background(?:-color)?:\s*#0065bc/s
    );
    expect(tabletStyles).toMatch(
      /\.dropdown-submenu\s*\{[^}]*display:\s*block !important;[^}]*width:\s*100%;/s
    );
    expect(tabletStyles).toMatch(
      /> \.dropdown-menu\s*\{[^}]*display:\s*none;[^}]*position:\s*relative !important;[^}]*width:\s*calc\(100% - 24px\) !important;/s
    );
    expect(tabletStyles).toMatch(
      /&\.open > \.dropdown-menu\s*\{[^}]*display:\s*block !important;/s
    );
    expect(tabletStyles).toMatch(
      /&:hover > \.dropdown-menu,[^}]*&:focus-within > \.dropdown-menu\s*\{[^}]*display:\s*none !important;/s
    );
    expect(tabletStyles).toContain("background: #0065bc !important;");
    expect(tabletStyles).toContain("margin-left: 24px !important;");
    expect(tabletStyles).toContain("border-left: 2px solid");
    expect(tabletStyles).toContain("border-bottom: 2px solid");
    expect(tabletStyles).toContain("bottom: 20px;");
    expect(tabletStyles).toContain("> li.dropdown > .dropdown-menu {");
  });

  it("uses full-width mobile navigation and a viewport-aligned search panel", () => {
    const collapsedBreakpoint = headerStyles.indexOf(
      "@media (max-width: 1170px)"
    );
    const mobileBreakpoint = headerStyles.indexOf("@media (max-width: 620px)");
    expect(collapsedBreakpoint).toBeGreaterThanOrEqual(0);
    expect(mobileBreakpoint).toBeGreaterThanOrEqual(0);

    const collapsedStyles = headerStyles.slice(
      collapsedBreakpoint,
      mobileBreakpoint
    );
    const mobileStyles = headerStyles.slice(mobileBreakpoint);
    expect(collapsedStyles).toContain("position: fixed !important;");
    expect(collapsedStyles).toContain("top: 14px !important;");
    expect(collapsedStyles).toContain("right: 12px !important;");
    expect(mobileStyles).toContain("position: fixed !important;");
    expect(mobileStyles).toContain("top: 14px !important;");
    expect(mobileStyles).toContain("right: 12px !important;");
    expect(mobileStyles).toContain("left: 12px;");
    expect(mobileStyles).toContain("width: auto !important;");
    expect(mobileStyles).toContain("padding-right: 0;");
    expect(mobileStyles).toContain("display: block;");
    expect(mobileStyles).toContain("width: 100%;");
    expect(collapsedStyles).toContain("left: 0;");
    expect(collapsedStyles).toContain("float: none;");
  });

  it("allows desktop dropdown menus to escape the rounded navigation", () => {
    expect(headerStyles).toContain("overflow: visible;");
    expect(headerStyles).not.toContain("overflow: hidden;");
  });
});
