import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import { change } from "redux-form";
import formReducers from "../../../store/reducers/formReducers";
import NewsLetterForm from "./index";

// react-recaptcha injects a real Google script tag on mount; stub it out so
// the form is testable without a live captcha widget.
jest.mock("react-recaptcha", () => () => null);

const buildStore = () => createStore(combineReducers({ form: formReducers }));

describe("NewsLetterForm", () => {
  it("renders the name/email fields and a Subscribe button", () => {
    render(
      <Provider store={buildStore()}>
        <NewsLetterForm callbackFunc={() => {}} />
      </Provider>
    );

    expect(screen.getByPlaceholderText("First Name*")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last Name*")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email*")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe" })
    ).toBeInTheDocument();
  });

  it("does not call callbackFunc when submitted with required fields empty", () => {
    const callbackFunc = jest.fn();

    render(
      <Provider store={buildStore()}>
        <NewsLetterForm callbackFunc={callbackFunc} />
      </Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(callbackFunc).not.toHaveBeenCalled();
  });

  it("calls callbackFunc with the submitted values once the form (incl. captcha) validates", () => {
    const callbackFunc = jest.fn();
    const store = buildStore();

    render(
      <Provider store={store}>
        <NewsLetterForm callbackFunc={callbackFunc} terms={false} />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("First Name*"), {
      target: { value: "Jane" }
    });
    fireEvent.change(screen.getByPlaceholderText("Last Name*"), {
      target: { value: "Doe" }
    });
    fireEvent.change(screen.getByPlaceholderText("Email*"), {
      target: { value: "jane@example.com" }
    });
    // Simulates the recaptcha widget's verifyCallback, which normally fires
    // this same action once a real user solves the captcha.
    store.dispatch(change("newsletter", "newsletter-captcha", true));

    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(callbackFunc).toHaveBeenCalledWith(
      expect.objectContaining({
        FNAME: "Jane",
        LNAME: "Doe",
        EMAIL: "jane@example.com"
      })
    );
  });
});
