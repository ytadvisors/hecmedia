const fs = require("fs");
const path = require("path");

const styles = fs.readFileSync(path.join(__dirname, "styles.scss"), "utf8");

test("modern nested Gutenberg galleries reserve responsive image columns", () => {
  expect(styles).toContain(".wp-block-gallery.has-nested-images");
  expect(styles).toContain("width: 100%;");
  expect(styles).toContain("> .wp-block-image");
  expect(styles).toContain("flex: 1 1 calc(33.333333% - 11px);");
  expect(styles).toContain("max-width: calc(33.333333% - 11px);");
  expect(styles).toContain("aspect-ratio: 4 / 3;");
  expect(styles).toContain("flex-basis: 100%;");
  expect(styles).toContain("max-width: 100%;");
});
