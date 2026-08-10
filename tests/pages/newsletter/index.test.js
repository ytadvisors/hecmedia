import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import NewsletterPage from "../../../pages/newsletter/index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("../../../containers/Layout", () => {
  const MockReact = require("react");
  return ({ children }) =>
    MockReact.createElement("div", { "data-testid": "layout" }, children);
});

jest.mock("../../../components/NewsletterSignupForm", () => {
  const MockReact = require("react");
  return ({ captchaSiteKey, captchaRequired, onSubscribe }) =>
    MockReact.createElement(
      "div",
      { "data-testid": "newsletter-signup-form" },
      `captchaSiteKey:${captchaSiteKey || "none"}`,
      `;captchaRequired:${captchaRequired}`,
      MockReact.createElement(
        "button",
        {
          type: "button",
          onClick: () => onSubscribe({ email: "test@example.invalid" })
        },
        "Submit test signup"
      )
    );
});

describe("Newsletter signup page (pages/newsletter/index.js)", () => {
  const originalNoSend = process.env.HECMEDIA_NO_SEND_FORMS;
  const originalNewsletterMode = process.env.HECMEDIA_NEWSLETTER_MODE;
  const originalSiteKey = process.env.RE_CAPTCHA_SITE_KEY;
  const originalLocalTest = process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;

  beforeEach(() => {
    useQuery.mockReturnValue({
      data: { newsletterSettings: { captchaEnabled: true } }
    });
  });

  afterEach(() => {
    if (originalNoSend === undefined) delete process.env.HECMEDIA_NO_SEND_FORMS;
    else process.env.HECMEDIA_NO_SEND_FORMS = originalNoSend;
    if (originalNewsletterMode === undefined)
      delete process.env.HECMEDIA_NEWSLETTER_MODE;
    else process.env.HECMEDIA_NEWSLETTER_MODE = originalNewsletterMode;
    if (originalSiteKey === undefined) delete process.env.RE_CAPTCHA_SITE_KEY;
    else process.env.RE_CAPTCHA_SITE_KEY = originalSiteKey;
    if (originalLocalTest === undefined)
      delete process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;
    else process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = originalLocalTest;
  });

  it("fails closed without rendering a submission form in newsletter omit mode", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    process.env.HECMEDIA_NEWSLETTER_MODE = "omit";
    process.env.RE_CAPTCHA_SITE_KEY = "staging-site-key";
    render(<NewsletterPage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(
      screen.queryByTestId("newsletter-signup-form")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("newsletter-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Stay Connected")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Subscribe to HEC Media" })
    ).toBeInTheDocument();
    expect(screen.getByText("Arts & Culture")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("St. Louis Stories")).toBeInTheDocument();
  });

  it("renders the form only when CAPTCHA is configured outside no-send mode", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    process.env.HECMEDIA_NEWSLETTER_MODE = "active";
    process.env.RE_CAPTCHA_SITE_KEY = "site-key";
    render(<NewsletterPage />);
    expect(screen.getByTestId("newsletter-signup-form")).toBeInTheDocument();
  });

  it("renders a CAPTCHA-free form in explicit local-test mode", () => {
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";
    delete process.env.RE_CAPTCHA_SITE_KEY;

    render(<NewsletterPage />);

    expect(screen.getByTestId("newsletter-signup-form")).toHaveTextContent(
      "captchaRequired:false"
    );
    expect(
      screen.queryByTestId("newsletter-unavailable")
    ).not.toBeInTheDocument();
  });

  it("renders a CAPTCHA-free form when WordPress Site Settings disables it", () => {
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "false";
    delete process.env.RE_CAPTCHA_SITE_KEY;
    useQuery.mockReturnValue({
      data: { newsletterSettings: { captchaEnabled: false } }
    });

    render(<NewsletterPage />);

    expect(screen.getByTestId("newsletter-signup-form")).toHaveTextContent(
      "captchaRequired:false"
    );
    expect(
      screen.queryByTestId("newsletter-unavailable")
    ).not.toBeInTheDocument();
  });

  it("fails closed when WordPress settings are unavailable and no site key exists", () => {
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "false";
    delete process.env.RE_CAPTCHA_SITE_KEY;
    useQuery.mockReturnValue({
      data: undefined,
      error: new Error("old schema")
    });

    render(<NewsletterPage />);

    expect(screen.getByTestId("newsletter-unavailable")).toBeInTheDocument();
    expect(
      screen.queryByTestId("newsletter-signup-form")
    ).not.toBeInTheDocument();
  });
});
