import React from "react";
import { render, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import rootReducer from "../../store/reducers";
import ProgramViewer from "./index";

// react-recaptcha injects a real Google script tag on mount; stub it out so
// the newsletter form nested under ProgramViewer is testable headlessly.
jest.mock("react-recaptcha", () => () => null);

const buildStore = () => createStore(rootReducer);

const setViewportWidth = width => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width
  });
};

describe("ProgramViewer", () => {
  it("gives the #subscribe anchor a real, functional sign-up target on mobile", () => {
    setViewportWidth(375);

    render(
      <Provider store={buildStore()}>
        <ProgramViewer>
          <div>content</div>
        </ProgramViewer>
      </Provider>
    );

    const subscribeTarget = document.getElementById("subscribe");
    expect(subscribeTarget).toBeInTheDocument();
    // The Header's "Subscribe" top-bar CTA links to "#subscribe" on every
    // page (see components/Header). On mobile this must render an actual
    // sign-up form, not just an empty anchor, or the click has no effect.
    expect(
      within(subscribeTarget).getByRole("button", { name: "Subscribe" })
    ).toBeInTheDocument();
  });

  it("keeps the desktop tabbed subscribe experience above the mobile breakpoint", () => {
    setViewportWidth(1440);

    render(
      <Provider store={buildStore()}>
        <ProgramViewer>
          <div>content</div>
        </ProgramViewer>
      </Provider>
    );

    const subscribeTarget = document.getElementById("subscribe");
    expect(subscribeTarget).toBeInTheDocument();
    expect(
      within(subscribeTarget).getByRole("button", { name: "Subscribe" })
    ).toBeInTheDocument();
  });
});
