import handler from "../../../../pages/api/newsletter/subscribe";
import formsAreNoSend from "../../../../lib/noSend";
import { getNewsletterAdapter } from "../../../../lib/newsletter/adapter";
import { LOCAL_TEST_CAPTCHA_TOKEN } from "../../../../lib/newsletter/localTest";

jest.mock("../../../../lib/noSend", () => jest.fn());
jest.mock("../../../../lib/newsletter/adapter", () => ({
  getNewsletterAdapter: jest.fn()
}));

const availableAdapter = {
  isAvailable: true,
  subscribe: jest.fn()
};

const validBody = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "reader@example.com",
  consent: true,
  captchaToken: "captcha-token"
};

function mockReqRes({
  method = "POST",
  body = {},
  host = "hecmedia.org"
} = {}) {
  const req = { method, body, headers: { host } };
  const res = {
    statusCode: undefined,
    body: undefined,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return { req, res };
}

describe("POST /api/newsletter/subscribe", () => {
  const originalLocalTest = process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;

  beforeEach(() => {
    delete process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;
    formsAreNoSend.mockReturnValue(false);
    getNewsletterAdapter.mockReturnValue(availableAdapter);
    availableAdapter.subscribe.mockClear();
    availableAdapter.subscribe.mockResolvedValue({
      ok: true,
      status: "accepted"
    });
  });

  afterAll(() => {
    if (originalLocalTest === undefined)
      delete process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST;
    else process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = originalLocalTest;
  });

  it("rejects non-POST methods", async () => {
    const { req, res } = mockReqRes({ method: "GET" });
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("400s with field errors when required fields are missing", async () => {
    const { req, res } = mockReqRes({ body: {} });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toMatchObject({
      firstName: expect.any(String),
      lastName: expect.any(String),
      email: expect.any(String),
      consent: expect.any(String)
    });
  });

  it("400s on an invalid email", async () => {
    const { req, res } = mockReqRes({
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "not-an-email",
        consent: true
      }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  it("rejects non-string and oversized identity fields", async () => {
    const { req, res } = mockReqRes({
      body: {
        firstName: { value: "Ada" },
        lastName: "L".repeat(101),
        email: "reader@example.com",
        consent: true
      }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toMatchObject({
      firstName: expect.any(String),
      lastName: expect.any(String)
    });
  });

  it("400s when consent is not explicitly true", async () => {
    const { req, res } = mockReqRes({
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "reader@example.com",
        consent: false
      }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.consent).toBeDefined();
  });

  it("returns an explicit non-success result in no-send mode", async () => {
    formsAreNoSend.mockReturnValue(true);
    const { req, res } = mockReqRes({ body: validBody });
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(getNewsletterAdapter).not.toHaveBeenCalled();
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("does not expose signup while no durable adapter is available", async () => {
    getNewsletterAdapter.mockReturnValue({ isAvailable: false });
    const { req, res } = mockReqRes({ body: validBody });
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.ok).toBe(false);
  });

  it("forwards a missing CAPTCHA token for authoritative WordPress enforcement", async () => {
    const { captchaToken, ...bodyWithoutCaptcha } = validBody;
    const { req, res } = mockReqRes({ body: bodyWithoutCaptcha });
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ captchaToken: undefined })
    );
  });

  it("rejects a malformed CAPTCHA token before subscription", async () => {
    const { req, res } = mockReqRes({
      body: { ...validBody, captchaToken: "short" }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.captchaToken).toBe("Spam verification failed");
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("allows a CAPTCHA-free request only in explicit loopback local-test mode", async () => {
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";
    const { captchaToken, ...bodyWithoutCaptcha } = validBody;
    const { req, res } = mockReqRes({
      body: bodyWithoutCaptcha,
      host: "127.0.0.1:3000"
    });

    await handler(req, res);

    expect(res.statusCode).toBe(202);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        captchaToken: LOCAL_TEST_CAPTCHA_TOKEN
      })
    );
  });

  it("never substitutes the local-test CAPTCHA token on a public host", async () => {
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST = "true";
    const { captchaToken, ...bodyWithoutCaptcha } = validBody;
    const { req, res } = mockReqRes({
      body: bodyWithoutCaptcha,
      host: "development.hecmedia.org"
    });

    await handler(req, res);

    expect(res.statusCode).toBe(202);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ captchaToken: undefined })
    );
    expect(availableAdapter.subscribe).not.toHaveBeenCalledWith(
      expect.objectContaining({ captchaToken: LOCAL_TEST_CAPTCHA_TOKEN })
    );
  });

  it("forwards the CAPTCHA token to WordPress for server-side verification", async () => {
    const { req, res } = mockReqRes({
      body: validBody
    });
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "reader@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        captchaToken: "captcha-token"
      })
    );
  });

  it("normalizes identity fields before the WordPress bridge", async () => {
    const { req, res } = mockReqRes({
      body: {
        ...validBody,
        firstName: " Ada ",
        lastName: " Lovelace ",
        email: "READER@EXAMPLE.COM"
      }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(202);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "reader@example.com",
      consent: true,
      captchaToken: "captcha-token",
      source: "newsletter-page"
    });
  });
});
