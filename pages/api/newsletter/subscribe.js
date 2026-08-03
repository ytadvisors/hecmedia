import validator from "validator";
import { getNewsletterAdapter } from "../../../lib/newsletter/adapter";
import formsAreNoSend from "../../../lib/noSend";
import {
  captchaIsConfigured,
  verifyCaptcha
} from "../../../lib/newsletter/captcha";

function validate(body) {
  const errors = {};
  const { firstName, lastName, email, consent } = body || {};

  if (!firstName || !`${firstName}`.trim()) errors.firstName = "Required";
  if (!lastName || !`${lastName}`.trim()) errors.lastName = "Required";
  if (!email || !validator.isEmail(`${email}`))
    errors.email = "Invalid email address";
  if (consent !== true) errors.consent = "Consent is required to subscribe";

  return errors;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const errors = validate(req.body);
  if (Object.keys(errors).length > 0) {
    res.status(400).json({ ok: false, errors });
    return;
  }

  // Check the staging safety boundary before even resolving an adapter. This
  // makes no-send deployments incapable of initializing a write integration.
  if (formsAreNoSend()) {
    res.status(503).json({
      ok: false,
      error: "Newsletter signup is not available at this time."
    });
    return;
  }

  const adapter = getNewsletterAdapter();
  if (!adapter.isAvailable) {
    res.status(503).json({
      ok: false,
      error: "Newsletter signup is not available at this time."
    });
    return;
  }

  if (!captchaIsConfigured()) {
    res.status(503).json({
      ok: false,
      error: "Newsletter signup is not configured."
    });
    return;
  }

  if (!req.body.captchaToken || typeof req.body.captchaToken !== "string") {
    res.status(400).json({
      ok: false,
      errors: { captchaToken: "Spam verification failed" }
    });
    return;
  }

  const captchaValid = await verifyCaptcha(
    req.body.captchaToken,
    req.headers && req.headers["x-forwarded-for"]
  );
  if (!captchaValid) {
    res.status(400).json({
      ok: false,
      errors: { captchaToken: "Spam verification failed" }
    });
    return;
  }

  const { firstName, lastName, email, consent } = req.body;

  try {
    const result = await adapter.subscribe({
      firstName,
      lastName,
      email,
      consent,
      source: "newsletter-page"
    });
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    res.status(502).json({ ok: false, error: "Subscribe failed" });
  }
}
