import React from "react";
import { render, screen } from "@testing-library/react";
import NewsletterThankYouPage from "../../../pages/newsletter/thank-you";

jest.mock("../../../containers/Layout", () => {
  const MockReact = require("react");
  return ({ children }) =>
    MockReact.createElement("div", { "data-testid": "layout" }, children);
});

jest.mock("../../../components/SEO", () => () => null);

describe("Newsletter thank-you page", () => {
  it("renders the confirmation instructions and first-party return action", () => {
    render(<NewsletterThankYouPage />);

    expect(
      screen.getByRole("heading", { name: "Thank You" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/confirm your email address to complete/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to the HEC Media home page" })
    ).toHaveAttribute("href", "/");
  });
});
