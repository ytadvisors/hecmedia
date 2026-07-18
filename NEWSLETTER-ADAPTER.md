# Newsletter signup — adapter contract

**Task:** #68050 (Feature D) | **Parent:** #68047
**Status:** shipped in staging no-send mode. No ESP is connected — this
documents the interface a real adapter must implement and what the client
needs to decide/provide before one can be turned on.

## What exists today

- `pages/newsletter/index.js` — standalone signup page (`/newsletter`), not
  the pre-existing `NewsLetter`/`NewsLetterForm` overlay widget.
- `components/NewsletterSignupForm/index.js` — first name, last name, email,
  and a required consent checkbox. Client-side validation, loading/success/
  error states, and a captcha-unavailable fallback (see below).
- `pages/api/newsletter/subscribe.js` — server-side validation, then calls
  `getNewsletterAdapter()` from `lib/newsletter/adapter.js`.
- `lib/newsletter/adapter.js` — the adapter contract plus the only adapter
  implemented so far, `MockNewsletterAdapter`, which records the attempt
  in-memory and returns `{ ok: true, id }`. It never opens a network
  connection. No subscriber data is transmitted anywhere, and no ESP
  credentials exist in this repo, staging environment, or CI secrets.

## The contract a real adapter must satisfy

```js
subscribe({ email, firstName, lastName, consent, source }) =>
  Promise<{ ok: true, id: string } | { ok: false, error: string }>
```

- Resolve (don't throw) for expected ESP outcomes — invalid address rejected
  by the ESP, duplicate subscriber, list-full, ESP outage — via
  `{ ok: false, error }`. Only throw for programmer error (e.g. missing
  config), which the API route already turns into a 502.
- `getNewsletterAdapter()` is the single selection point. A real adapter must
  still check `formsAreNoSend()` (`lib/noSend.js`) first and fall back to
  `MockNewsletterAdapter` — staging (`HECMEDIA_NO_SEND_FORMS=true`) must never
  be able to send, regardless of what ESP config is present.

## What's needed to wire a real adapter later

1. **ESP choice from Jayne/Dennis** — Mailchimp, ConvertKit, MailerLite, or
   Constant Contact. `containers/NewsLetterContainer.js` has a commented-out
   `addToMailchimp` call suggesting Mailchimp was the original assumption,
   but nothing is confirmed or connected today.
2. **Credentials, once an ESP is chosen** (illustrative — exact names depend
   on the ESP picked):
   - Mailchimp: API key, server prefix (e.g. `us21`), audience/list ID.
   - ConvertKit: API key/secret, form ID.
   - MailerLite / Constant Contact: API key, group/list ID.
3. **Where secrets would live** — production Lambda env vars via
   `serverless.yml` (same mechanism as `APOLLO_CLIENT_URI` today), never
   committed to the repo. Staging must keep using the mock adapter even
   after production credentials exist, per `STAGING_AUTOMATION.md`.
4. **Double vs. single opt-in** — a client decision that changes whether
   `subscribe()` returns immediately-subscribed or pending-confirmation.

## Captcha-unavailable behavior

The existing `components/ReactForm/Captcha` reads `RE_CAPTCHA_SITE_KEY`
directly and has no fallback if it's unset. `NewsletterSignupForm` instead
checks for the key up front: if present, it renders a slot for the real
widget; if absent, it shows a "spam verification is temporarily unavailable"
notice and does **not** block submission on a missing captcha token. This
avoids the failure mode where an unset key would silently make the form
unsubmittable.

## Testing

- `lib/newsletter/adapter.test.js` — mock adapter never throws, always
  resolves ok, records what it "sent."
- `pages/api/newsletter/subscribe.test.js` — method/validation/consent
  handling, and that a valid request reaches the mock adapter.
- `components/NewsletterSignupForm/index.test.js` — field validation,
  loading/success/error states, and both captcha-availability branches.
- `pages/newsletter/index.test.js` — page composition (Layout + form).

Run `yarn test` — no network access required; everything above is unit-level
against the mock adapter.
