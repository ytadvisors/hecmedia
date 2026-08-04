const {
  createHandler,
  decodeBody,
  validate
} = require("./newsletter-api-edge");

function event(method = "POST", body = {}) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  return {
    Records: [
      {
        cf: {
          request: {
            uri: "/api/newsletter/subscribe",
            method,
            body: {
              encoding: "base64",
              data: Buffer.from(data).toString("base64")
            }
          }
        }
      }
    ]
  };
}

const validPayload = {
  firstName: " Ada ",
  lastName: " Lovelace ",
  email: "READER@example.com",
  consent: true,
  captchaToken: "captcha-token-123"
};

test("decodes CloudFront request bodies", () => {
  expect(decodeBody(event("POST", validPayload).Records[0].cf.request)).toBe(
    JSON.stringify(validPayload)
  );
});

test("validates every consent and identity field", () => {
  expect(validate({})).toEqual({
    firstName: "Required",
    lastName: "Required",
    email: "Invalid email address",
    consent: "Consent is required to subscribe",
    captchaToken: "Spam verification failed"
  });
  expect(validate(validPayload)).toEqual({});
});

test("forwards normalized data and preserves the non-enumerating response", async () => {
  const forward = jest.fn().mockResolvedValue({
    status: 202,
    json: { ok: true, status: "accepted" }
  });
  const response = await createHandler(forward)(event("POST", validPayload));

  expect(response.status).toBe("202");
  expect(JSON.parse(response.body)).toEqual({ ok: true, status: "accepted" });
  expect(forward).toHaveBeenCalledWith(
    "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe",
    {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "reader@example.com",
      consent: true,
      captchaToken: "captcha-token-123",
      source: "newsletter-page"
    },
    8000
  );
});

test("rejects invalid requests without calling WordPress", async () => {
  const forward = jest.fn();
  const response = await createHandler(forward)(event("POST", {}));

  expect(response.status).toBe("400");
  expect(response.headers["cache-control"][0].value).toBe("no-store");
  expect(forward).not.toHaveBeenCalled();
});

test("fails closed without exposing WordPress details", async () => {
  const forward = jest.fn().mockResolvedValue({
    status: 503,
    json: { code: "private_provider_configuration", message: "private" }
  });
  const response = await createHandler(forward)(event("POST", validPayload));

  expect(response.status).toBe("502");
  expect(response.body).not.toContain("private");
});

test("handles OPTIONS and rejects unsupported methods", async () => {
  const handler = createHandler(jest.fn());
  const options = await handler(event("OPTIONS", ""));
  const get = await handler(event("GET", ""));

  expect(options.status).toBe("204");
  expect(options.body).toBe("");
  expect(get.status).toBe("405");
});

test("rejects oversized bodies before JSON parsing", async () => {
  const response = await createHandler(jest.fn())(
    event("POST", "x".repeat(16 * 1024 + 1))
  );

  expect(response.status).toBe("413");
});
