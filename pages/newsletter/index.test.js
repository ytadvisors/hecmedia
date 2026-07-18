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
  it("renders inside Layout with the signup form and page copy", () => {
    render(<NewsletterPage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("newsletter-signup-form")).toBeInTheDocument();
    expect(screen.getByText("Stay Connected")).toBeInTheDocument();
  });
});
