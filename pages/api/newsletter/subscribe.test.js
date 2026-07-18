import handler from "./subscribe";
import {
  getNewsletterAdapter,
  resetNewsletterAdapterForTests
} from "../../../lib/newsletter/adapter";

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
  afterEach(() => {
    resetNewsletterAdapterForTests();
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

  it("200s and records the attempt via the mock adapter on valid input", async () => {
    const { req, res } = mockReqRes({
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "reader@example.com",
        consent: true
      }
    });
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(getNewsletterAdapter().sent).toHaveLength(1);
  });
});
