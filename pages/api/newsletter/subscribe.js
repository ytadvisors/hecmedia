import validator from "validator";
import { getNewsletterAdapter } from "../../../lib/newsletter/adapter";

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

// Staging-only subscribe endpoint. It always goes through
// getNewsletterAdapter(), which today only resolves to the in-memory mock —
// no subscriber data ever leaves this process. See
// docs/newsletter-adapter-contract.md for what a production adapter needs.
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

  const { firstName, lastName, email, consent } = req.body;
  const adapter = getNewsletterAdapter();

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
