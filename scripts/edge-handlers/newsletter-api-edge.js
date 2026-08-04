const https = require("https");
const { URL } = require("url");

const NEWSLETTER_PATH = "/api/newsletter/subscribe";
const WORDPRESS_ENDPOINT =
  "https://prod-wp.hectv.org/wp-json/hectv/v1/newsletter/subscribe";
const MAX_BODY_BYTES = 16 * 1024;
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const descriptions = {
  202: "Accepted",
  204: "No Content",
  400: "Bad Request",
  404: "Not Found",
  405: "Method Not Allowed",
  413: "Payload Too Large",
  502: "Bad Gateway"
};

function jsonResponse(status, body, extraHeaders = {}) {
  return {
    status: String(status),
    statusDescription: descriptions[status] || "OK",
    headers: {
      "content-type": [
        { key: "Content-Type", value: "application/json; charset=utf-8" }
      ],
      "cache-control": [{ key: "Cache-Control", value: "no-store" }],
      ...extraHeaders
    },
    bodyEncoding: "text",
    body: status === 204 ? "" : JSON.stringify(body)
  };
}

function decodeBody(request) {
  if (!request.body || typeof request.body.data !== "string") return "";
  return request.body.encoding === "base64"
    ? Buffer.from(request.body.data, "base64").toString("utf8")
    : request.body.data;
}

function validate(payload) {
  const errors = {};
  const { firstName, lastName, email, consent, captchaToken } = payload || {};

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    firstName.trim().length > 100
  ) {
    errors.firstName = "Required";
  }
  if (
    typeof lastName !== "string" ||
    !lastName.trim() ||
    lastName.trim().length > 100
  ) {
    errors.lastName = "Required";
  }
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !EMAIL_RE.test(email)
  ) {
    errors.email = "Invalid email address";
  }
  if (consent !== true) {
    errors.consent = "Consent is required to subscribe";
  }
  if (
    typeof captchaToken !== "string" ||
    captchaToken.length < 10 ||
    captchaToken.length > 4096
  ) {
    errors.captchaToken = "Spam verification failed";
  }

  return errors;
}

function postJson(urlString, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = JSON.stringify(payload);
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        },
        timeout: timeoutMs
      },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch (error) {
            json = null;
          }
          resolve({ status: response.statusCode || 0, json });
        });
      }
    );

    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.end(data);
  });
}

function createHandler(forward = postJson) {
  return async event => {
    const { request } = event.Records[0].cf;
    const uri = (request.uri || "").split("?")[0];

    if (uri !== NEWSLETTER_PATH) {
      return jsonResponse(404, { ok: false, error: "Not found" });
    }
    if (request.method === "OPTIONS") {
      return jsonResponse(
        204,
        {},
        {
          allow: [{ key: "Allow", value: "POST, OPTIONS" }],
          "access-control-allow-methods": [
            { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" }
          ],
          "access-control-allow-headers": [
            { key: "Access-Control-Allow-Headers", value: "Content-Type" }
          ]
        }
      );
    }
    if (request.method !== "POST") {
      return jsonResponse(
        405,
        { ok: false, error: "Method not allowed" },
        { allow: [{ key: "Allow", value: "POST, OPTIONS" }] }
      );
    }

    const rawBody = decodeBody(request);
    if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
      return jsonResponse(413, { ok: false, error: "Request is too large" });
    }

    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const errors = validate(payload);
    if (Object.keys(errors).length > 0) {
      return jsonResponse(400, { ok: false, errors });
    }

    const providerPayload = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      consent: true,
      captchaToken: payload.captchaToken,
      source: "newsletter-page"
    };

    try {
      const { status, json } = await forward(
        WORDPRESS_ENDPOINT,
        providerPayload,
        8000
      );
      if (
        status === 202 &&
        json &&
        json.ok === true &&
        json.status === "accepted"
      ) {
        return jsonResponse(202, { ok: true, status: "accepted" });
      }
      if (status === 400) {
        return jsonResponse(400, {
          ok: false,
          error: "Please check your information and spam verification."
        });
      }
    } catch (error) {
      // The public response deliberately does not expose origin or provider details.
    }

    return jsonResponse(502, {
      ok: false,
      error: "We could not start your subscription. Please try again later."
    });
  };
}

exports.handler = createHandler();
exports.createHandler = createHandler;
exports.decodeBody = decodeBody;
exports.jsonResponse = jsonResponse;
exports.validate = validate;
