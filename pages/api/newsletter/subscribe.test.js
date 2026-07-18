import handler from "./subscribe";
import formsAreNoSend from "../../../lib/noSend";
import { getNewsletterAdapter } from "../../../lib/newsletter/adapter";
import {
  captchaIsConfigured,
  verifyCaptcha
} from "../../../lib/newsletter/captcha";

jest.mock("../../../lib/noSend", () => jest.fn());
jest.mock("../../../lib/newsletter/adapter", () => ({
  getNewsletterAdapter: jest.fn()
}));
jest.mock("../../../lib/newsletter/captcha", () => ({
  captchaIsConfigured: jest.fn(),
  verifyCaptcha: jest.fn()
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

function mockReqRes({ method = "POST", body = {} } = {}) {
  const req = { method, body };
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
  beforeEach(() => {
    formsAreNoSend.mockReturnValue(false);
    getNewsletterAdapter.mockReturnValue(availableAdapter);
    captchaIsConfigured.mockReturnValue(true);
    verifyCaptcha.mockResolvedValue(true);
    availableAdapter.subscribe.mockResolvedValue({
      ok: true,
      id: "subscriber-1"
    });
  });

  it("rejects non-POST methods", async () => {
    const { req, res } = mockReqRes({ method: "GET" });
    await handler(req, res);
    expect(res.statusCode).toBe(405);
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
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("does not expose signup while no durable adapter is available", async () => {
    getNewsletterAdapter.mockReturnValue({ isAvailable: false });
    const { req, res } = mockReqRes({ body: validBody });
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.ok).toBe(false);
  });

  it("fails closed when CAPTCHA is not configured", async () => {
    captchaIsConfigured.mockReturnValue(false);
    const { req, res } = mockReqRes({ body: validBody });
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("rejects a missing CAPTCHA token before verification or subscription", async () => {
    const { captchaToken, ...bodyWithoutCaptcha } = validBody;
    const { req, res } = mockReqRes({ body: bodyWithoutCaptcha });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.captchaToken).toBe("Spam verification failed");
    expect(verifyCaptcha).not.toHaveBeenCalled();
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("rejects a failed CAPTCHA without calling the adapter", async () => {
    verifyCaptcha.mockResolvedValue(false);
    const { req, res } = mockReqRes({ body: validBody });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors.captchaToken).toBe("Spam verification failed");
    expect(availableAdapter.subscribe).not.toHaveBeenCalled();
  });

  it("only calls an available adapter after server-side CAPTCHA verification", async () => {
    const { req, res } = mockReqRes({
      body: validBody
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(verifyCaptcha).toHaveBeenCalledWith("captcha-token", undefined);
    expect(availableAdapter.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ email: "reader@example.com" })
    );
  });
});
