# HEC Media — public web app (`hecmedia`)

Next.js frontend for **[HEC Media / HEC TV](https://hecmedia.org)** — the public site that renders schedules, articles, video content, search, and site chrome from the headless WordPress CMS.

Built and maintained by **[YT Advisors](https://ytadvisors.com)** for the HEC client engagement.

---

## Temporary public visibility

> **This repository is temporarily public** so HEC stakeholders can review engineering work.
>
> It will return to **private** when that review window closes. Do not treat this clone as a long-term open-source product.
>
> **Do not commit secrets.** Environment files (`.env`, `.env.local`, deploy credentials, API keys, reCAPTCHA secrets, etc.) are gitignored. Only **names** of variables appear below — never real values. Copy `.env.local.example` for local development and fill values from the approved secret store.

---

## What this system is

| Layer                                     | Role                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| **This repo (`hecmedia`)**                | Next.js + Apollo GraphQL client — SSR/SSG pages, layout, players, forms               |
| **WordPress CMS** (`ytadvisors/hectv-wp`) | Content of record — posts, ACF fields, menus, site settings, WPGraphQL API            |
| **Deploy path**                           | Serverless Components (`@sls-next`) → Lambda@Edge + CloudFront + S3 (see `DEPLOY.md`) |

Editors work in WordPress; readers hit this app. The frontend does **not** own the content database.

```
Editors ──► WordPress / ACF / menus (hectv-wp)
                 │
                 ▼
            WPGraphQL API
                 │
                 ▼
         hecmedia (this repo) ──► public readers
```

---

## Stack

- **Next.js** (Pages router) with custom `server.js` for local dev
- **Apollo Client** (`apollo-boost` / `@apollo/react-*`) against the CMS GraphQL endpoint
- **React** UI: layout, nav, schedules, posts, video, newsletter signup, SEO
- **Jest** unit tests + optional Playwright acceptance / e2e suites
- **Serverless Components** (`serverless.yml`) for CloudFront/Lambda@Edge packaging

Key application areas:

| Path                          | Purpose                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| `pages/`                      | Routes (home, posts, categories, events, search, magazine, newsletter, API) |
| `components/`                 | Presentational UI (Header, Footer, Schedule, players, lists, forms, …)      |
| `containers/`                 | Layout and composed containers                                              |
| `lib/graphql.js`              | GraphQL operations (contract with the CMS)                                  |
| `lib/getFunctions.js`         | Data-fetch helpers used by pages                                            |
| `lib/stagingCompatibility.js` | Compatibility with modern WPGraphQL / staging CMS shapes                    |
| `scripts/`                    | Smoke tests, staging deploy helpers, jury diversity check                   |
| `tests/e2e/`                  | GraphQL and write-guarded e2e suites                                        |

---

## Engineering highlights

1. **Headless CMS contract** — GraphQL operations in `lib/graphql.js` are aligned with the CMS schema inventory in `hectv-wp` (`docs/WPGRAPHQL-SCHEMA-CONTRACT.md` there). Deprecated collections (e.g. event/magazine) are being retired as the CMS modernizes.

2. **Staging / modern WPGraphQL compatibility** — Feature flags and compatibility helpers allow pointing at a modernized staging CMS without hard-coding production secrets in the repo.

3. **Safety rails for e2e** — Write-capable e2e paths refuse production hosts (see `tests/e2e/support/writeGuard.js` and comments in `.env.local.example`).

4. **Deploy discipline** — Production deploys are human-gated through the protected GitHub `production` environment. Read `DEPLOY.md` before any release. The legacy `yarn deploy` / Serverless path remains blocked; a green `yarn build` alone is not permission to ship.

---

## Prerequisites

- Node.js compatible with this repo’s lockfile / CI (use the version your team standardizes on)
- Yarn (preferred; scripts documented as `yarn …`)
- Network access to a WordPress GraphQL endpoint for real data (local Docker CMS, staging, or approved remote)

---

## Quick start (local)

```shell
# From a clean clone
yarn install

# Configure local env (gitignored). Do not commit this file.
cp .env.local.example .env.local
# Edit .env.local with values from the approved secret store only.

yarn dev
```

### Environment variables (names only)

Set these in a **local, gitignored** file (e.g. `.env.local`) or your deploy secret mechanism. **Do not paste real values into the README, issues, or commits.**

| Variable                     | Purpose                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `APOLLO_CLIENT_URI`          | GraphQL HTTP endpoint (e.g. local or staging `…/graphql`)                  |
| `WP_HOST` / `GATSBY_WP_HOST` | WordPress origin for media/API helpers                                     |
| `HECMEDIA_MODERN_WPGRAPHQL`  | Toggle modern CMS contract compatibility                                   |
| `HECMEDIA_NO_SEND_FORMS`     | Disable real form delivery in non-prod                                     |
| `HECMEDIA_TOPBAR_CTAS_JSON`  | Optional top-bar CTA configuration                                         |
| `RE_CAPTCHA_SITE_KEY`        | Public reCAPTCHA site key (WordPress owns verification)                    |
| `HECTV_NEWSLETTER_ENDPOINT`  | Optional WordPress newsletter bridge URL; otherwise derived from `WP_HOST` |
| `DEPLOY_SHA`                 | Optional build identity for deploy tooling                                 |
| `SUBDOMAIN` / `DOMAIN`       | Deploy target hostname pieces (`serverless.yml`)                           |
| `ACTIVE_ENV`                 | Optional selector for `.env.<name>` loading in `next.config.js`            |

See `.env.local.example` for the local Docker CMS pattern. Production and staging values live in the org’s secret store — never in git.

---

## Scripts

| Command                       | Purpose                         |
| ----------------------------- | ------------------------------- |
| `yarn dev`                    | Local Next server (`server.js`) |
| `yarn build` / `yarn start`   | Production build / start        |
| `yarn test`                   | Jest unit tests                 |
| `yarn test:e2e`               | Jest e2e config                 |
| `yarn test:acceptance`        | Playwright                      |
| `yarn smoke`                  | Smoke script                    |
| `yarn lint` / `yarn lint:fix` | ESLint                          |

Deploy-related commands are described in **`DEPLOY.md`**. Treat production deploy as **explicit, human-approved** work only; the approved production entrypoint is `.github/workflows/production-deploy.yml`, never a workstation deployment.

---

## Testing notes

- Unit tests live next to sources and under `tests/`; e2e lives under `tests/e2e/`.
- Coverage thresholds are configured in `package.json` (`jest.coverageThreshold`).
- When pointing e2e at a CMS, use staging or localhost. Production hosts are blocked for write paths.

---

## Related repositories

| Repo                                                            | Relationship                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| [`ytadvisors/hectv-wp`](https://github.com/ytadvisors/hectv-wp) | Headless WordPress CMS + GraphQL API this app consumes      |
| This app in production                                          | Served via CloudFront / Lambda@Edge (Serverless Components) |

---

## Documentation in this repo

| Doc                                              | Purpose                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [`DEPLOY.md`](DEPLOY.md)                         | Deploy, rollback-by-redeploy, Next/serverless compatibility checkpoint |
| [`docs/operations/production-release-playbook-2026-08-06.md`](docs/operations/production-release-playbook-2026-08-06.md) | Reviewed cross-repository production release sequence and gates |
| [`docs/incidents/2026-08-06-production-deployment.md`](docs/incidents/2026-08-06-production-deployment.md) | Production incident report, RCA, findings, and corrective actions |
| [`.env.local.example`](.env.local.example)       | Local CMS pointer template (no secrets)                                |
| [`NEWSLETTER-ADAPTER.md`](NEWSLETTER-ADAPTER.md) | Newsletter integration notes                                           |
| [`MIXED_JURY.md`](MIXED_JURY.md) / jury scripts  | Review diversity process helpers                                       |

---

## Security

- Never commit `.env*`, AWS keys, JWT secrets, Stripe keys, reCAPTCHA **secret** keys, or CMS admin credentials.
- Prefer short-lived credentials and org-managed secret stores for deploy and CI.
- If you suspect a secret was committed historically, rotate it immediately and scrub history with the security owner — do not “fix” by only editing the README.

---

## License & ownership

Client work product for **HEC Media / HEC TV**, engineered by **YT Advisors**.  
Upstream open-source dependencies retain their own licenses. Temporary public access does **not** grant rights to reuse HEC branding, production content, or non-public credentials.

---

## Maintainers

**YT Advisors** — [ytadvisors.com](https://ytadvisors.com)

Default branch: `master`. Changes ship via branch → PR → review → merge.
