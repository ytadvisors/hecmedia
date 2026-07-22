import React from "react";
import { render, screen } from "@testing-library/react";
import Captcha from "./index";

jest.mock("react-recaptcha", () => ({ sitekey }) => (
  <div data-testid="recaptcha-widget">{sitekey}</div>
));

const props = {
  input: { name: "test-captcha" },
  displayErrors: false,
  meta: { touched: false, error: undefined },
  change: jest.fn()
};

describe("Captcha", () => {
  const originalSiteKey = process.env.RE_CAPTCHA_SITE_KEY;

  afterEach(() => {
    if (originalSiteKey === undefined) delete process.env.RE_CAPTCHA_SITE_KEY;
    else process.env.RE_CAPTCHA_SITE_KEY = originalSiteKey;
  });

  it("does not initialize reCAPTCHA when the site key is absent", () => {
    delete process.env.RE_CAPTCHA_SITE_KEY;

    render(<Captcha {...props} />);

    expect(screen.queryByTestId("recaptcha-widget")).not.toBeInTheDocument();
  });

  it("passes a configured site key to reCAPTCHA", () => {
    process.env.RE_CAPTCHA_SITE_KEY = "configured-site-key";

    render(<Captcha {...props} />);

    expect(screen.getByTestId("recaptcha-widget")).toHaveTextContent(
      "configured-site-key"
    );
  });
});
