import fs from "fs";
import path from "path";

const pageStyles = fs.readFileSync(
  path.join(__dirname, "../../../pages/newsletter/styles.scss"),
  "utf8"
);
const formStyles = fs.readFileSync(
  path.join(__dirname, "../../../components/NewsletterSignupForm/styles.scss"),
  "utf8"
);
const cssDependencies = fs.readFileSync(
  path.join(__dirname, "../../../lib/cssDependencies.scss"),
  "utf8"
);

describe("Newsletter editorial layout", () => {
  it("uses the HEC blue editorial hero and signup divider", () => {
    expect(pageStyles).toMatch(
      /\.newsletter-hero\s*\{[\s\S]*background: #075fae;/
    );
    expect(pageStyles).toMatch(
      /\.newsletter-signup-panel\s*\{[\s\S]*border-top: 5px solid #0065bc;/
    );
    expect(cssDependencies).toContain(
      '@import "../pages/newsletter/styles.scss";'
    );
  });

  it("stacks the hero and form fields for narrow screens", () => {
    expect(pageStyles).toMatch(/@media \(max-width: 767px\)/);
    expect(pageStyles).toMatch(
      /\.newsletter-hero__copy,[\s\S]*\.newsletter-hero__art\s*\{[\s\S]*width: 100%;/
    );
    expect(formStyles).toMatch(/@media \(max-width: 640px\)/);
    expect(formStyles).toMatch(
      /\.newsletter-signup-form\s*\{\s*grid-template-columns: 1fr;/
    );
  });
});
