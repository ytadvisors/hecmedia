import fs from "fs";
import path from "path";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "pages", "_app.js"),
  "utf8"
);
const globalScss = fs.readFileSync(
  path.join(__dirname, "cssDependencies.scss"),
  "utf8"
);

describe("global CSS entrypoint", () => {
  it("bundles react-datepicker through Next's JavaScript CSS pipeline", () => {
    expect(appSource).toContain(
      'import "react-datepicker/dist/react-datepicker.css";'
    );
    expect(globalScss).not.toContain("react-datepicker.css");
    expect(globalScss).not.toContain("../node_modules/");
  });
});
