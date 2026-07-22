import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NewsletterPage from "../../../pages/newsletter/index";

jest.mock("../../../containers/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock(
  "../../../components/NewsletterSignupForm",
  () => ({ captchaSiteKey, onSubscribe }) => (
    <div data-testid="newsletter-signup-form">
      captchaSiteKey:{captchaSiteKey || "none"}
      <button
        type="button"
        onClick={() => onSubscribe({ email: "test@example.invalid" })}
      >
        Submit test signup
      </button>
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

  it("keeps the browser submission seam available in no-send mode", async () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "true";
    process.env.RE_CAPTCHA_SITE_KEY = "staging-site-key";
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true })
    });
    render(<NewsletterPage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("newsletter-signup-form")).toBeInTheDocument();
    expect(
      screen.queryByTestId("newsletter-unavailable")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Stay Connected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit test signup" }));
    expect(global.fetch).toHaveBeenCalledWith("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.invalid" })
    });
    global.fetch = originalFetch;
  });

  it("renders the form only when CAPTCHA is configured outside no-send mode", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    process.env.RE_CAPTCHA_SITE_KEY = "site-key";
    render(<NewsletterPage />);
    expect(screen.getByTestId("newsletter-signup-form")).toBeInTheDocument();
  });
});
