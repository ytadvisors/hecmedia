import axios from "axios";
import {
  getNewsletterAdapter,
  getWordPressNewsletterConfig,
  resetNewsletterAdapterForTests,
  SUBSCRIBE_ERROR,
  UnavailableNewsletterAdapter,
  WordPressMailchimpAdapter
} from "./adapter";

jest.mock("axios");

const ENV_NAMES = [
  "HECMEDIA_NO_SEND_FORMS",
  "HECTV_NEWSLETTER_ENDPOINT",
  "WP_HOST"
];
const originalEnv = ENV_NAMES.reduce(
  (values, name) => ({ ...values, [name]: process.env[name] }),
  {}
);

function restoreEnvironment() {
  ENV_NAMES.forEach(name => {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  });
}

describe("newsletter adapter", () => {
  beforeEach(() => {
    process.env.HECMEDIA_NO_SEND_FORMS = "false";
    delete process.env.HECTV_NEWSLETTER_ENDPOINT;
    delete process.env.WP_HOST;
    axios.post.mockReset();
    resetNewsletterAdapterForTests();
  });

  afterAll(() => {
    restoreEnvironment();
    resetNewsletterAdapterForTests();
  });

  it("resolves to the unavailable adapter until durable configuration exists", () => {
    const adapter = getNewsletterAdapter();
    expect(adapter).toBeInstanceOf(UnavailableNewsletterAdapter);
    expect(adapter.isAvailable).toBe(false);
  });

  it("stays unavailable in no-send mode even when WordPress exists", () => {
    process.env.HECMEDIA_NO_SEND_FORMS = "true";
    process.env.WP_HOST = "https://prod-wp.hectv.org";

    expect(getNewsletterAdapter()).toBeInstanceOf(UnavailableNewsletterAdapter);
  });

  it("derives the owned REST endpoint from WP_HOST", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org/";

    expect(getWordPressNewsletterConfig()).toEqual({
      endpoint:
        "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe"
    });
    expect(getNewsletterAdapter()).toBeInstanceOf(WordPressMailchimpAdapter);
  });

  it("prefers an explicit endpoint", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org";
    process.env.HECTV_NEWSLETTER_ENDPOINT =
      "https://origin.hectv.org/internal-newsletter/";

    expect(getWordPressNewsletterConfig().endpoint).toBe(
      "https://origin.hectv.org/internal-newsletter"
    );
  });

  it("forwards the exact payload and maps the non-enumerating response", async () => {
    const adapter = new WordPressMailchimpAdapter({
      endpoint:
        "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe"
    });
    const payload = {
      email: "reader@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      consent: true,
      captchaToken: "captcha-token-123",
      source: "newsletter-page"
    };
    const body = JSON.stringify(payload);
    axios.post.mockResolvedValue({
      data: { ok: true, status: "accepted" }
    });

    await expect(adapter.subscribe(payload)).resolves.toEqual({
      ok: true,
      status: "accepted"
    });
    expect(axios.post).toHaveBeenCalledWith(adapter.endpoint, body, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 8000
    });
  });

  it("rejects a provider response that could expose subscriber state", async () => {
    const adapter = new WordPressMailchimpAdapter({
      endpoint:
        "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe"
    });
    axios.post.mockResolvedValue({
      data: { ok: true, status: "subscribed", existing: true }
    });

    await expect(
      adapter.subscribe({ email: "reader@example.com" })
    ).resolves.toEqual({
      ok: false,
      error: SUBSCRIBE_ERROR
    });
  });

  it("resolves provider failures without leaking upstream details", async () => {
    const adapter = new WordPressMailchimpAdapter({
      endpoint:
        "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe"
    });
    axios.post.mockRejectedValue(
      new Error("Mailchimp secret provider response must stay private")
    );

    await expect(
      adapter.subscribe({ email: "reader@example.com" })
    ).resolves.toEqual({
      ok: false,
      error: SUBSCRIBE_ERROR
    });
  });

  it("returns the same configured instance across calls", () => {
    process.env.WP_HOST = "https://prod-wp.hectv.org";
    expect(getNewsletterAdapter()).toBe(getNewsletterAdapter());
  });
});
