import React from "react";
import { render, screen } from "@testing-library/react";
import NewsletterPage from "./index";

jest.mock("../../containers/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock(
  "../../components/NewsletterSignupForm",
  () => ({ captchaSiteKey }) => (
    <div data-testid="newsletter-signup-form">
      captchaSiteKey:{captchaSiteKey || "none"}
    </div>
  )
);

describe("Newsletter signup page (pages/newsletter/index.js)", () => {
  const originalNoSend = process.env.HECMEDIA_NO_SEND_FORMS;
  const originalSiteKey = process.env.RE_CAPTCHA_SITE_KEY;

  afterEach(() => {
    if (originalNoSend === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = originalNoSend;
    if (originalSiteKey === undefined) delete process.env.RE_CAPTCHA_SITE_KEY;
    else process.env.RE_CAPTCHA_SITE_KEY = originalSiteKey;
  });

  it("gates the public form in no-send mode", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "true";
    render(<NewsletterPage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(
      screen.queryByTestId("newsletter-signup-form")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("newsletter-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Stay Connected")).toBeInTheDocument();
  });

  it("renders the form only when CAPTCHA is configured outside no-send mode", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    process.env.RE_CAPTCHA_SITE_KEY = "site-key";
    render(<NewsletterPage />);
    expect(screen.getByTestId("newsletter-signup-form")).toBeInTheDocument();
  });
});
