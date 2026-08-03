import {
  getNewsletterAdapter,
  resetNewsletterAdapterForTests,
  UnavailableNewsletterAdapter
} from "./adapter";

describe("newsletter adapter", () => {
  afterEach(() => {
    resetNewsletterAdapterForTests();
  });

  it("resolves to the unavailable adapter until a durable adapter is configured", () => {
    const adapter = getNewsletterAdapter();
    expect(adapter).toBeInstanceOf(UnavailableNewsletterAdapter);
    expect(adapter.isAvailable).toBe(false);
  });

  it("returns the same instance across calls", () => {
    expect(getNewsletterAdapter()).toBe(getNewsletterAdapter());
  });

  it("never reports a durable subscription when no adapter is configured", async () => {
    const adapter = getNewsletterAdapter();
    const payload = {
      email: "reader@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      consent: true,
      source: "newsletter-page"
    };

    const result = await adapter.subscribe(payload);

    expect(result).toEqual({
      ok: false,
      error: "Newsletter signup is not available at this time."
    });
  });
});
