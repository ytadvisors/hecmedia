import validator from "validator";
import { getNewsletterAdapter } from "../../../lib/newsletter/adapter";
import formsAreNoSend from "../../../lib/noSend";

function validate(body) {
  const errors = {};
  const { firstName, lastName, email, consent, captchaToken } = body || {};

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    firstName.trim().length > 100
  )
    errors.firstName = "Required";
  if (
    typeof lastName !== "string" ||
    !lastName.trim() ||
    lastName.trim().length > 100
  )
    errors.lastName = "Required";
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !validator.isEmail(email)
  )
    errors.email = "Invalid email address";
  if (consent !== true) errors.consent = "Consent is required to subscribe";
  if (
    typeof captchaToken !== "string" ||
    captchaToken.length < 10 ||
    captchaToken.length > 4096
  )
    errors.captchaToken = "Spam verification failed";

  return errors;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

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

  const { firstName, lastName, email, consent, captchaToken } = req.body;

  try {
    // WordPress owns CAPTCHA verification because its ECS runtime can keep the
    // secret out of the legacy Lambda@Edge build artifact.
    const result = await adapter.subscribe({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      consent,
      captchaToken,
      source: "newsletter-page"
    });
    res.status(result.ok ? 202 : 502).json(result);
  } catch (err) {
    res.status(502).json({ ok: false, error: "Subscribe failed" });
  }
}
