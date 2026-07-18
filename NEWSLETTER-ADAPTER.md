# Newsletter signup — adapter contract

**Task:** #68050 (Feature D) | **Parent:** #68047
**Status:** safely gated. No ESP or durable review queue is connected, so the
page and API do not accept signups or claim that a subscription was saved.

## What exists today

- `pages/newsletter/index.js` — standalone signup page (`/newsletter`), not
  the pre-existing `NewsLetter`/`NewsLetterForm` overlay widget.
- `components/NewsletterSignupForm/index.js` — first name, last name, email,
  a required consent checkbox, and a real reCAPTCHA widget when enabled.
- `pages/api/newsletter/subscribe.js` — server-side validation, then calls
  `getNewsletterAdapter()` from `lib/newsletter/adapter.js`.
- `lib/newsletter/adapter.js` — the adapter contract currently resolves to an
  unavailable adapter. It returns a non-success result until an ESP or durable
  review-queue adapter is provisioned.

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
  set `isAvailable=true` and must never accept submissions when
  `formsAreNoSend()` (`lib/noSend.js`) is true.

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

## Exposure and CAPTCHA policy

The public page is gated when `HECMEDIA_NO_SEND_FORMS=true` or no
`RE_CAPTCHA_SITE_KEY` is available. The API separately rejects no-send and
unavailable-adapter requests before it processes personal information. Once a
durable adapter is added, production must provide `RE_CAPTCHA_SECRET_KEY`; the
API verifies the submitted token with Google and fails closed on missing,
invalid, or unverifiable CAPTCHA. The site key alone is not enough to expose
the form safely.

## Testing

- `lib/newsletter/adapter.test.js` — unavailable adapter never reports a
  durable subscription.
- `pages/api/newsletter/subscribe.test.js` — method, no-send/unavailable
  adapter, validation, and CAPTCHA abuse-control handling.
- `components/NewsletterSignupForm/index.test.js` — field validation,
  loading/success/error states, and both captcha-availability branches.
- `pages/newsletter/index.test.js` — page composition (Layout + form).

Run `yarn test` — no network access required; everything above is unit-level
against the mock adapter.
