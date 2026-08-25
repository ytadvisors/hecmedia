import {
  executeReviewedContentScripts,
  markClientNavigation,
  PAYPAL_DONATE_SDK,
  resetReviewedContentScriptStateForTests
} from "./reviewedContentScripts";

const donateMarkup = `
  <script src="${PAYPAL_DONATE_SDK}" charset="UTF-8"></script>
  <div id="paypal-donate-button-container"></div>
  <script>
    PayPal.Donation.Button({ hosted_button_id: "TEST" })
      .render("#paypal-donate-button-container");
  </script>
`;

describe("reviewed WordPress content scripts", () => {
  beforeEach(() => {
    resetReviewedContentScriptStateForTests();
    window.history.replaceState({}, "", "/about-us");
    window.PayPal = { Donation: { Button: jest.fn() } };
  });

  afterEach(() => {
    delete window.PayPal;
    resetReviewedContentScriptStateForTests();
  });

  it("does not replay scripts during the initial hydrated document", async () => {
    const root = document.createElement("div");
    root.innerHTML = donateMarkup;

    await expect(executeReviewedContentScripts(root)).resolves.toBe(false);
    expect(
      root.querySelector('[data-hec-reviewed-content-script="paypal-inline"]')
    ).toBeNull();
  });

  it("replays the reviewed PayPal inline script after client navigation", async () => {
    const root = document.createElement("div");
    root.innerHTML = donateMarkup;
    markClientNavigation();

    await expect(executeReviewedContentScripts(root)).resolves.toBe(true);
    expect(root.dataset.hecReviewedContentScriptsExecuted).toBe("1");
    expect(
      root.querySelector('[data-hec-reviewed-content-script="paypal-inline"]')
    ).not.toBeNull();
  });

  it("executes a route only once per client navigation", async () => {
    const first = document.createElement("div");
    const duplicate = document.createElement("div");
    first.innerHTML = donateMarkup;
    duplicate.innerHTML = donateMarkup;
    markClientNavigation();

    await expect(executeReviewedContentScripts(first)).resolves.toBe(true);
    await expect(executeReviewedContentScripts(duplicate)).resolves.toBe(false);
  });

  it("does not execute unreviewed remote or inline scripts", async () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <script src="https://example.com/unreviewed.js"></script>
      <script>window.unreviewed = true;</script>
    `;
    markClientNavigation();

    await expect(executeReviewedContentScripts(root)).resolves.toBe(false);
    expect(root.querySelector("script").dataset.hecReviewedContentScript).toBe(
      undefined
    );
  });
});
