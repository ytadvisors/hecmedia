const fs = require("fs");
const path = require("path");

const layoutStyles = fs.readFileSync(
  path.join(__dirname, "styles.scss"),
  "utf8"
);

describe("Layout focus indicators", () => {
  it("does not leave focus rings after pointer activation", () => {
    expect(layoutStyles).toContain("a:focus:not(:focus-visible)");
    expect(layoutStyles).toContain("button:focus:not(:focus-visible)");
    expect(layoutStyles).toContain("outline: none !important;");
  });

  it("retains visible keyboard focus with header contrast", () => {
    expect(layoutStyles).toContain("a:focus-visible");
    expect(layoutStyles).toContain("button:focus-visible");
    expect(layoutStyles).toContain("outline: 2px solid #005fcc !important;");
    expect(layoutStyles).toContain(".header a:focus-visible");
    expect(layoutStyles).toContain("outline-color: #fff !important;");
  });
});
