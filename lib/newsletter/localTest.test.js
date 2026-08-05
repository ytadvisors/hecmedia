import {
  isNewsletterLocalTestMode,
  isNewsletterLocalTestRequest
} from "./localTest";

describe("newsletter local-test safety boundary", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLocalTest = process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalLocalTest === undefined)
      delete process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;
    else process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = originalLocalTest;
  });

  it("requires an explicit flag outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;
    expect(isNewsletterLocalTestMode()).toBe(false);

    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";
    expect(isNewsletterLocalTestMode()).toBe(true);
  });

  it("cannot be enabled in production", () => {
    process.env.NODE_ENV = "production";
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";
    expect(isNewsletterLocalTestMode()).toBe(false);
    expect(
      isNewsletterLocalTestRequest({ headers: { host: "localhost:3000" } })
    ).toBe(false);
  });

  it("accepts loopback hosts and rejects public or malformed hosts", () => {
    process.env.NODE_ENV = "development";
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";

    expect(
      isNewsletterLocalTestRequest({ headers: { host: "localhost:3000" } })
    ).toBe(true);
    expect(
      isNewsletterLocalTestRequest({ headers: { host: "127.0.0.1:3000" } })
    ).toBe(true);
    expect(
      isNewsletterLocalTestRequest({
        headers: { host: "development.hecmedia.org" }
      })
    ).toBe(false);
    expect(isNewsletterLocalTestRequest({ headers: {} })).toBe(false);
  });
});
