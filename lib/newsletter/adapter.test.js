import {
  getNewsletterAdapter,
  resetNewsletterAdapterForTests,
  MockNewsletterAdapter
} from "./adapter";

describe("newsletter adapter", () => {
  afterEach(() => {
    resetNewsletterAdapterForTests();
  });

  it("resolves to the mock adapter", () => {
    const adapter = getNewsletterAdapter();
    expect(adapter).toBeInstanceOf(MockNewsletterAdapter);
  });

  it("returns the same instance across calls", () => {
    expect(getNewsletterAdapter()).toBe(getNewsletterAdapter());
  });

  it("never transmits data — records the attempt in-memory and returns ok", async () => {
    const adapter = getNewsletterAdapter();
    const payload = {
      email: "reader@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      consent: true,
      source: "newsletter-page"
    };

    const result = await adapter.subscribe(payload);

    expect(result.ok).toBe(true);
    expect(result.id).toEqual(expect.any(String));
    expect(adapter.sent).toHaveLength(1);
    expect(adapter.sent[0]).toMatchObject(payload);
  });
});
