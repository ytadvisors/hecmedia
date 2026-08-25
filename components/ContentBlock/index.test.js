import React from "react";
import { render } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import ContentBlock from "./index";
import {
  markClientNavigation,
  PAYPAL_DONATE_SDK,
  resetReviewedContentScriptStateForTests
} from "../../lib/reviewedContentScripts";

const donateMarkup = `
  <script src="${PAYPAL_DONATE_SDK}"></script>
  <div id="paypal-donate-button-container"></div>
  <script>PayPal.Donation.Button({ hosted_button_id: "TEST" })</script>
`;

describe("ContentBlock", () => {
  beforeEach(() => {
    resetReviewedContentScriptStateForTests();
    window.history.replaceState({}, "", "/about-us");
    window.PayPal = { Donation: { Button: jest.fn() } };
  });

  afterEach(() => {
    delete window.PayPal;
    resetReviewedContentScriptStateForTests();
  });

  it("preserves the content body and replays reviewed scripts after navigation", async () => {
    markClientNavigation();
    const { container } = render(
      <ContentBlock header="About" content={donateMarkup} type="white-block" />
    );
    const body = container.querySelector("div.content-body");

    expect(body).not.toBeNull();
    await act(async () => {
      await Promise.resolve();
    });
    expect(body.dataset.hecReviewedContentScriptsExecuted).toBe("1");
    expect(
      body.querySelector('[data-hec-reviewed-content-script="paypal-inline"]')
    ).not.toBeNull();
  });
});
