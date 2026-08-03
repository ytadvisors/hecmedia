# Newsletter signup — WordPress/Mailchimp adapter

The public `/newsletter` page submits to the same-origin Next.js endpoint at
`/api/newsletter/subscribe`. The API validates the visitor payload, fails closed
when forms are disabled, and forwards the browser reCAPTCHA token to the owned
WordPress bridge.

```text
browser -> /api/newsletter/subscribe
        -> WordPress /wp-json/hectv/v1/newsletter/subscribe -> reCAPTCHA
        -> Mailchimp for WordPress -> Newsletter Master
```

WordPress owns both credentialed operations: reCAPTCHA verification and the
Mailchimp write. This is intentional. The legacy HEC Media Lambda@Edge runtime
cannot receive request-time secrets, so no CAPTCHA or Mailchimp credential may
be placed in the frontend environment or JavaScript build artifact.

Mailchimp sends a double-opt-in confirmation. The page therefore says to check
the inbox instead of claiming that an accepted address is already subscribed.

## Adapter contract

```js
subscribe({ email, firstName, lastName, consent, captchaToken, source }) =>
  Promise<
    | { ok: true, status: "accepted" }
    | { ok: false, error: string }
  >
```

Expected provider failures resolve to a generic non-success result. Upstream
errors and credentials are never returned to the browser. WordPress returns the
same `accepted` response for new, pending, and subscribed addresses so the API
cannot be used to enumerate the audience.

The adapter is available only when both of these are true:

- `HECMEDIA_NO_SEND_FORMS` is not `true`;
- the WordPress endpoint is configured directly or derivable from `WP_HOST`.

## Runtime configuration

| Variable                    | Visibility           | Purpose                                |
| --------------------------- | -------------------- | -------------------------------------- |
| `RE_CAPTCHA_SITE_KEY`       | public               | Renders the browser CAPTCHA            |
| `HECTV_NEWSLETTER_ENDPOINT` | server route         | Optional explicit WordPress REST URL   |
| `WP_HOST`                   | existing app config  | Derives the default WordPress REST URL |
| `HECMEDIA_NO_SEND_FORMS`    | build/runtime safety | Disables every durable form write      |

The reCAPTCHA secret is `HECTV_RECAPTCHA_SECRET_KEY` in the WordPress production
secret, not this application. `next.config.js` also blocks known server-only
newsletter and CAPTCHA variable names from its legacy local-environment spread.

## Deployment order

1. Add the reCAPTCHA secret to the approved WordPress production secret.
2. Deploy the coordinated `hectv-wp` endpoint first; it fails closed without
   that secret.
3. Verify WordPress sees exactly one `Newsletter Master` Mailchimp audience.
4. Deploy this adapter with the public reCAPTCHA site key.
5. Submit one approved test address and verify the pending double-opt-in state.

Do not run the legacy `yarn deploy` path while `DEPLOY.md` carries the Next 12
Lambda@Edge compatibility block. Publishing remains a separately authorized
deployment step.

## Testing

- `lib/newsletter/adapter.test.js` verifies configuration, no-send isolation,
  exact request forwarding, non-enumerating response mapping, and provider-error
  containment.
- `tests/pages/api/newsletter/subscribe.test.js` verifies validation, no-send,
  normalization, CAPTCHA-token forwarding, and adapter ordering.
- `components/NewsletterSignupForm/index.test.js` verifies browser validation
  and interaction states.
- `tests/acceptance/mock-parity.spec.js` intercepts the subscription request so
  acceptance testing never creates a subscriber.

Run `yarn test`; no test contacts WordPress, Google, or Mailchimp.
