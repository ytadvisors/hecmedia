import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NewsletterSignupForm from "./index";

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Ada" }
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Lovelace" }
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "reader@example.com" }
  });
  fireEvent.click(screen.getByLabelText(/I agree to receive/));
}

describe("NewsletterSignupForm", () => {
  it("shows the captcha-unavailable notice when no site key is configured", () => {
    render(<NewsletterSignupForm onSubscribe={jest.fn()} />);
    expect(screen.getByTestId("captcha-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("captcha-slot")).not.toBeInTheDocument();
  });

  it("renders the captcha slot when a site key is configured", () => {
    render(
      <NewsletterSignupForm onSubscribe={jest.fn()} captchaSiteKey="abc123" />
    );
    expect(screen.getByTestId("captcha-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("captcha-unavailable")).not.toBeInTheDocument();
  });

  it("blocks submission and shows field errors when required fields are missing", async () => {
    const onSubscribe = jest.fn();
    render(<NewsletterSignupForm onSubscribe={onSubscribe} />);

    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(await screen.findAllByText("Required")).toHaveLength(2);
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(
      screen.getByText("You must agree to receive email updates")
    ).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without calling onSubscribe", async () => {
    const onSubscribe = jest.fn();
    render(<NewsletterSignupForm onSubscribe={onSubscribe} />);

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ada" }
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Lovelace" }
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" }
    });
    fireEvent.click(screen.getByLabelText(/I agree to receive/));
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument();
    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("shows a loading state while onSubscribe is pending, then success", async () => {
    let resolveSubscribe;
    const onSubscribe = jest.fn(
      () =>
        new Promise(resolve => {
          resolveSubscribe = resolve;
        })
    );
    render(<NewsletterSignupForm onSubscribe={onSubscribe} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(await screen.findByRole("button")).toHaveTextContent("Subscribing…");

    resolveSubscribe({ ok: true, id: "mock-1" });

    expect(await screen.findByTestId("newsletter-success")).toBeInTheDocument();
  });

  it("shows an error state when onSubscribe resolves not-ok", async () => {
    const onSubscribe = jest.fn().mockResolvedValue({
      ok: false,
      error: "Subscribe failed"
    });
    render(<NewsletterSignupForm onSubscribe={onSubscribe} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Subscribe failed"
    );
  });

  it("shows an error state when onSubscribe rejects", async () => {
    const onSubscribe = jest.fn().mockRejectedValue(new Error("network down"));
    render(<NewsletterSignupForm onSubscribe={onSubscribe} />);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    expect(await screen.findByTestId("form-error")).toBeInTheDocument();
  });
});
