# HEC Media website — mock-vs-staging gap spec and remediation plan

**Status:** DESIGN REVIEW — needs kronos (anthropic) + kronos-gpt (openai) approval before any code.
**Author:** Tom (COO)
**Date:** 2026-07-22
**Audited surface:** `https://development.hecmedia.org` at master `104363a`, plus the
`Main w/ Tim Revisions` client mock.
**Supersedes the acceptance criteria of:** #68041, #68042, #68043, #68044, #68048, #68049, #68050.

---

## 1. Why this document exists

Tasks #68041–#68050 are all closed `done` and features A/B/C/D/E/F/G are reported
delivered. Staging deployed successfully twice on 2026-07-22 (runs `29894688778`,
`29896468330`), so the deployed bundle _is_ current master. The client still reports the
site does not look done.

The audit below was run against the live staging DOM, not against the tickets. **One of
the seven client requirements is genuinely met.** The other six were closed against the
_ticket title_ rather than the _client requirement text_, and every one of them shipped as
a hardcoded, env-flag-gated preview rather than a CMS-driven feature.

The tickets are not lying about what they built. They built something else.

---

## 2. Root cause

Three compounding causes, in order of importance:

**2.1 — Spec drift between the client requirement and the ticket title.**
Two features were re-scoped somewhere between the client list and the queue row:

| Client asked for                                                 | Ticket built                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| (f) adjust the **size of header images** on article pages        | #68044 "Feature F — header **font** sizing"                 |
| (b) replace the Spotlight **logo** with a **new image and link** | #68042 "Feature B — Spotlight → 'For Educators' **rename**" |

Nobody re-read the client requirement at close time, so both closed green.

**2.2 — "Additive preview" instead of "replacement".**
Features C and G were added _next to_ the thing they were supposed to replace, behind
`HECMEDIA_*_PREVIEW` env flags, with visible `STAGING PREVIEW` / `STAGING ONLY` badges.
The old UI was never removed. To the client this reads as "nothing changed, and now
there's a second half-built thing below it."

**2.3 — The real blocker nobody escalated: the ACF field source is unavailable.**
`dev-infra/wordpress/RUNBOOK.md` documents it plainly — the custom WP-side PHP that
registers `postDetails`, `requiredPosts`, `feedDesign`, `pageTemplate` etc. is not in this
repo or any repo available to us. Every requirement with the word _customizable_,
_manually feature_, or _adjust_ (c, f, g) needs a CMS field to store the choice. With no
way to register fields, Jerome hardcoded the values in JSX and shipped. **That was the
right engineering call and the wrong reporting call** — it should have surfaced as a
blocker on the epic, not as seven green tickets.

This is the item to fix first. Everything in §4 depends on it.

---

## 3. Audit — requirement by requirement

Verified in the live staging DOM unless noted.

### (a) Sticky header — ✅ **DONE**

`<header class="header header--sticky">`, `getComputedStyle().position === "sticky"`,
layout space preserved, `header--scrolled` treatment on scroll. Covered by
`components/Header/index.test.js`. No further work.

### (b) Replace the Spotlight logo with a new image + link — ❌ **NOT DONE**

The old logo still renders in the right rail: `<img alt="Link to the spotlight">`.
`document.querySelectorAll('.educators-card').length === 0`.

The `educators-card` markup exists in `components/ProgramViewer/index.js`, but the home
page does not render `ProgramViewer` — the rail is `components/SideNavigation`, which was
never touched. The feature was built on a surface the client never sees.

Per the mock, the replacement is the **"FOR EDUCATORS" spiral-notebook card** at the top
of the rail, and the image + destination must be editable, not compiled in.

### (c) Remove newsletter from the rail, replace with Trending Now — ❌ **PARTIAL / WRONG SHAPE**

- `document.querySelectorAll('.col-lg-3 form').length === 1` — **the newsletter signup
  block is still in the rail.** It was never removed.
- Trending Now was appended _below_ it, so the rail is now newsletter → Trending Now,
  instead of Trending Now replacing the newsletter.
- It renders a `STAGING PREVIEW` badge to the client.
- `document.querySelectorAll('[class*=trending] img').length === 0` — **no thumbnails.**
  The mock is a thumbnail list. Ours is a text list.
- Data source is wrong: `lib/trendingNow.js` maps `spotLightPosts`, and its own comment
  says so — _"temporary staging data source. Replace spotlightPosts with a dedicated
  WPGraphQL/ACF query when editorial support is available."_ The requirement is **newest
  video posted, auto-populated**, plus **manual featuring**. Neither is implemented.

Note the mock keeps a separate **HEC-TV SPOTLIGHT** list _below_ Trending Now. Trending
Now replaces the _newsletter_, not the Spotlight list.

### (d) Newsletter signup page → Thank You redirect — ⚠️ **BROKEN IN PRODUCTION**

`/newsletter` returns 200. **`/newsletter/thank-you` returns 404 on staging.**

`pages/newsletter/thank-you.js` exists and `Router.push("/newsletter/thank-you")` is
wired, so it passes in Jest and fails on the deployed Lambda@Edge. Cause is
`route-list.json`: the catch-all is `{"page": "[page]/", "pattern": "/:page"}` — a single
segment. Nothing matches a two-segment `/newsletter/thank-you`, so the router 404s.

This is the highest-severity item: a client-facing form that dead-ends on submit.

### (e) Sub-dropdown menus in the navigation — ❌ **NOT DONE**

`document.querySelectorAll('.dropdown-menu .dropdown-menu, .dropdown-menu li ul').length === 0`.
`Header.getNavDropDown` renders exactly one flat level (`link.children.map`) with no
recursion. There is no second level anywhere in the nav.

Separately, the nav that shipped does not match the mock:

| Mock                                                          | Staging                                               |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| ABOUT · PROGRAMS · PRODUCTION SERVICES · WATCH NOW · READ NOW | WATCH · LEARN & EXPLORE · CONNECT · SUPPORT HEC MEDIA |

`lib/navigationPreview.js` is a hardcoded keyword-matcher that invents its own five
groups and buckets anything unrecognised into `CONNECT`. That is why _HEC Films_,
_Books_, _Genres_ and _Business_ are all filed under "Connect". The grouping must come
from the WordPress menu tree, not from a keyword list in our bundle.

### (f) Adjust header image size on article pages — ❌ **NOT DONE AT ALL**

Zero matches for `headerImage|imageSize|heroSize|featuredImageSize` across
`components/`, `pages/`, `lib/`. #68044 shipped responsive _font_ sizing instead. This
requirement has no implementation of any kind.

### (g) Customizable linked buttons next to the social icons — ⚠️ **PARTIAL**

Three buttons render, but:

- Labels are `Watch Live` / `Subscribe` / `Donate`; the mock says **SUBSCRIBE · SUPPORT ·
  GET INVOLVED**.
- `Donate` is a `<button>` that navigates nowhere and shows a visible
  `STAGING ONLY` badge plus "Donations are disabled in this staging preview."
- All three are hardcoded in `components/Header/index.js` behind
  `HECMEDIA_TOPBAR_CTA_PREVIEW`. The requirement word is **customizable** — label, URL,
  order and count must be editable without a deploy.

### Summary

| Req | Client requirement                                             | Status                                           |
| --- | -------------------------------------------------------------- | ------------------------------------------------ |
| a   | Sticky header                                                  | ✅ done                                          |
| b   | Replace Spotlight logo w/ new image + link                     | ❌ not done (built on an unrendered component)   |
| c   | Newsletter → Trending Now (auto-newest video + manual feature) | ❌ partial, wrong data, newsletter still present |
| d   | Newsletter page → Thank You redirect                           | ⚠️ **404 in production**                         |
| e   | Sub-dropdown menus                                             | ❌ not done (one flat level)                     |
| f   | Article header image sizing                                    | ❌ no implementation                             |
| g   | Customizable top-bar buttons                                   | ⚠️ partial, hardcoded, one dead button           |

---

## 4. Remediation plan

### Gate 0 — define and verify the CMS contract locally (blocks b, c, f, g; do this first)

Build a **checked-in local mu-plugin candidate**,
`dev-infra/wordpress/mu-plugins/hectv-site-options.php`. It is source code for the local
Docker WordPress environment, not an authorization to install anything on production.
It replaces the unavailable ACF source with a native WordPress contract we can test.

Fields to register:

| Field                     | Native storage and validation                                                                                                           | REST / WPGraphQL shape                                                                                                    | Editing authority                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `hectv_rail_promo`        | option object `{image_id: positive int, url: esc_url_raw, alt: sanitize_text_field}`; reject missing image or invalid URL               | `GET/PUT /wp-json/hectv/v1/site-options`; GraphQL `hectvSiteOptions.railPromo { image { id sourceUrl altText } url alt }` | `manage_options`                              |
| `hectv_featured_videos`   | option array of unique, ordered published video post IDs; `absint`, max 12, nullable                                                    | REST `featuredVideoIds: [ID!]!`; GraphQL `featuredVideos: [Post!]!`                                                       | `edit_others_posts` plus post-type capability |
| `hectv_topbar_ctas`       | option array (max 5) of `{label: sanitize_text_field, url: esc_url_raw, style: enum(primary|secondary|tertiary)}`; drop incomplete rows | REST `topbarCtas`; GraphQL `topbarCtas { label url style }`                                                               | `manage_options`                              |
| `hectv_header_image_size` | post meta enum `small|medium|large|full`; `sanitize_key`, default `full`, registered with `single: true`                                | REST `meta.hectv_header_image_size`; GraphQL `headerImageSize` on the supported post type                                 | `edit_post` for that post                     |

The plugin must register settings/meta with `show_in_rest`, sanitizers, and `auth_callback`
checks matching the capabilities above. Its WPGraphQL fields must return the same typed values
as REST and never expose an edit mutation to an unauthenticated request. It must add an
authenticated `wp-admin` Settings page for the three site options and a post editor metabox (or
registered post-meta control) for image size. Saving is nonce-protected, checks the relevant
capability, reports validation errors without partial writes, and renders the saved value when
the editor reopens.

Local acceptance, owned by the worker-mba WordPress gate:

1. Sync only `dev-infra/wordpress/` to worker-mba and start the local Docker stack.
2. Log into local `wp-admin` as the seeded editor/admin; create, edit, save, and reopen each
   field. Repeat one denied save as an insufficient-capability user and one invalid payload.
3. Assert the saved values through authenticated REST and public/read-safe WPGraphQL, then run
   the real `store/api` read path against `localhost:8091`.
4. Keep fixtures in `seed.sh` and add automated save/edit, validation, authorization, REST, and
   WPGraphQL coverage. The local API tests must prove both success and negative paths.

Build and verify only against **local Docker WP** (`dev-infra/wordpress/`, worker-mba, port 8091)
— never `prod-wp.hectv.org`. The local instance has no ACF and stubs `hectv/v1`; do not
extend that stub. Register real native fields in the candidate plugin so the local code path is
the one proposed for review.

### Then, in dependency order

**T1 — (d) Fix the Thank You 404.** _Highest priority — client-facing dead end._
Add explicit `newsletter` routes to `route-list.json` (`/newsletter`,
`/newsletter/thank-you`). Add to `scripts/verify-staging.js` a hard assertion that
`/newsletter/thank-you` returns 200 on the deployed distribution, so this can never
regress silently. A Jest-green route that 404s in Lambda@Edge is exactly the class of bug
the deploy verifier exists to catch.

**Safe acceptance seam (required):** remove the page-level
`HECMEDIA_NO_SEND_FORMS` early return so the rendered form always calls
`POST /api/newsletter/subscribe`. Preserve no-send at the server/deployment boundary: the
API handler must return non-success without calling the subscription adapter when present,
and the existing staging package must continue to omit the API bundle rather than grant a
write-capable Lambda. In the Playwright test, register `page.route()` before navigation and
use only `route.fulfill({ ok: true })` for that exact same-origin POST; never continue or
fallback the route. Thus the request is observable and `onSuccess()` reaches the Thank You
route, while the staging server, adapter, and ESP receive no request or write. Add a page
unit test proving no-send mode still invokes this browser seam, plus API/deploy tests proving
ordinary no-send requests cannot call the adapter. Configure only Google's non-production
reCAPTCHA v2 test site/secret pair in staging — never a production key.

**T2 — (c) Trending Now replaces the newsletter, properly.**
Remove the newsletter block from the right rail entirely (it now lives on `/newsletter`,
per requirement d — that is the whole point of building that page). Trending Now takes
its slot, above the retained HEC-TV Spotlight list. Render thumbnails. Data: newest
video-type posts, auto-populated, overridden in order by `hectv_featured_videos` when
set. Delete the `spotLightPosts` adapter and the `STAGING PREVIEW` badge.

**T3 — (e) Real sub-dropdowns from the CMS menu tree.**
Make `Header.getNavDropDown` recursive to at least two levels, keyboard-accessible
(arrow/escape) and touch-usable. Delete `lib/navigationPreview.js` and the
`HECMEDIA_NAVIGATION_PREVIEW` flag — the top-level grouping is whatever the WordPress
menu says it is. Configure the mock's five items (ABOUT, PROGRAMS, PRODUCTION SERVICES,
WATCH NOW, READ NOW) only in local WP as test fixture data.

**T4 — (g) Real customizable CTAs.**
Render from `hectv_topbar_ctas`. No hardcoded labels, no dead buttons, no
`STAGING ONLY` badge, no `HECMEDIA_TOPBAR_CTA_PREVIEW` flag. Seed with SUBSCRIBE /
SUPPORT / GET INVOLVED per the mock. A CTA with no URL is not rendered rather than
rendered dead.

**T5 — (b) Rail promo card.**
Replace the Spotlight logo in `components/SideNavigation` — **the component the home page
actually renders** — with the `hectv_rail_promo` image + link. Seed with the FOR
EDUCATORS notebook card from the mock. Verify in the staging DOM, not in Jest.
The one element retired here is the ProgramViewer rail image at
`/posts/as-seen-on-spotlight` using `/static/assets/spotlight-img.jpg`; the acceptance
gate matches that exact link-and-asset pair, so retained HEC-TV Spotlight list thumbnails
(§(b) notes, T2) are not caught by it.

**T6 — (f) Article header image sizing.**
Consume `hectv_header_image_size` in the article template; four sizes; default preserves
today's rendering so existing posts don't shift. Editor-facing, per-post. Render the real
`.article-header-image` wrapper with a
`data-header-image-size` value. The local seed supplies the five stable browser fixtures
`/posts/header-image-size-{small,medium,large,full,default}`: the first four must render
strictly increasing desktop widths, and the meta-free `default` fixture must render at
exactly the same width as explicit `full`. This is a visual contract, not merely a marker
contract.

**T6 fixture and rendering contract (required):** `dev-infra/wordpress/seed.sh` must
idempotently create these five local posts:
`/posts/header-image-size-small`, `-medium`, `-large`, `-full`, and `-default`.
The first four carry `hectv_header_image_size` values `small`, `medium`, `large`, and
`full`; `header-image-size-default` deliberately has no value. The real article template
must render exactly one `.article-header-image` wrapper and resolve missing meta to
`data-header-image-size="full"` before rendering. At the desktop acceptance viewport,
the wrapper widths must be strictly increasing small → medium → large → full, while the
meta-free default fixture must have exactly the explicit full width. A data marker without
the measured layout is not evidence of sizing.

**T7 — Mock-parity QA pass.**
Side-by-side against the mock at desktop/tablet/mobile. No `STAGING PREVIEW` or
`STAGING ONLY` badge anywhere. Attach screenshots to the task before it closes.

### Production approval boundary (separate from this build)

No remediation task may install the candidate plugin on `prod-wp.hectv.org`, alter the
production navigation menu, seed production content, or hand anything to the client. Those are
three separately approved, client-owned changes after local verification and code review:

1. Jayne/Yomi approve a production plugin-install playbook with backup, rollback, exact plugin
   checksum, and a named operator.
2. Jayne approves the production menu configuration and content mapping after reviewing the
   local fixture/export; the approved operator applies it and verifies it in production.
3. Jayne accepts the staging/production evidence before the client handoff and Payment 2 flow.

Until all three approvals are recorded, this branch produces only local source, fixtures, and
verification evidence. The plugin candidate is not “the same plugin installed on the client’s
WP”; it is an unapproved deployment artifact.

### The development loop: local first, staging to confirm

**Nobody deploys to staging to find out whether a change works.** In the 24h to
2026-07-22 the staging-deploy workflow ran 11 times: **9 failures, 2 successes**, at ~7–8
minutes each. That is the team using a CloudFront/Lambda@Edge pipeline as its
edit-refresh cycle. It is the second reason this batch went wrong — the first being that
unit tests cannot see the deployed page (§2).

The local loop already existed and was simply never pointed at the app. Stood up and
verified working on worker-mba on 2026-07-22 (browser and container work stays off the
iMac orchestrator):

```bash
ssh worker-mba
cd ~/hecmedia-dev-wp && docker compose up -d          # WP 6.8 + MySQL 5.7, content fixtures, :8091
cd ~/hecmedia-local
WP_HOST=http://localhost:8091 GATSBY_WP_HOST=http://localhost:8091 \
  APOLLO_CLIENT_URI=http://localhost:8091/graphql \
  NODE_OPTIONS=--openssl-legacy-provider yarn dev      # app on :3000, real content

STAGING_SITE_URL=http://localhost:3000 yarn test:acceptance   # same suite, seconds not minutes
```

`tests/acceptance/mock-parity.spec.js` takes its target from `STAGING_SITE_URL`, so the
**identical** suite runs against localhost and against staging. That is deliberate: the
assertion that gates the merge is the assertion the developer already ran locally.

Required order for T1–T6:

1. Change the code.
2. `yarn test` — unit. Necessary, not sufficient; all six gaps passed this.
3. `yarn test:acceptance` against **localhost:3000 + the local Docker WP**. This is where
   the requirement is proven and the loop is seconds long.
4. Only then open the PR and let staging deploy.
5. Re-run the acceptance suite against staging once.

**Step 5 is not optional, and this is the part that is easy to get wrong.** Measured on
the freshly-built local stack, 2026-07-22:

```
local   (yarn dev, :3000)            GET /newsletter/thank-you -> 200
staging (Lambda@Edge, CloudFront)    GET /newsletter/thank-you -> 404
```

Requirement (d) **cannot fail locally**. `yarn dev` runs `server.js` with next-routes
against the filesystem, so the page resolves. The 404 exists only once the app is built to
`target: "experimental-serverless-trace"` and served through Lambda@Edge, where
`route-list.json` is the routing table and its catch-all is single-segment. A team that
adopted "test locally first" and stopped there would have declared (d) delivered — again.

The two layers catch disjoint classes of failure, so the batch needs both:

| Layer                                           | Catches                                          | Blind to                  |
| ----------------------------------------------- | ------------------------------------------------ | ------------------------- |
| Local Docker WP + `yarn dev` + acceptance suite | b, c, e, f, g — everything about what renders    | routing / deploy topology |
| Acceptance suite against deployed staging       | d — Lambda@Edge routing, build-target divergence | nothing, but costs ~8 min |

This is why T1 ships a hard `/newsletter/thank-you` assertion in
`scripts/verify-staging.js` and not only a test: the deploy verifier is the only layer
that can structurally see that class of failure.

### The local loop does not work yet — Gate 0 has to fix that first

Standing the loop up on 2026-07-22 surfaced something that changes Gate 0's scope. The
local stack **does not faithfully render the site**, so a local run today is not a valid
gate. Running the acceptance suite against `localhost:3000` reports `8 failed / 6 passed`
against staging's `12 failed / 2 passed`, and **the difference is almost entirely
environmental, not real**:

- `dev.log`: `ApolloError: GraphQL error: Cannot query field "scheduleBy" on type "RootQuery"`. The local WPGraphQL is core-schema-only, exactly as
  `dev-infra/wordpress/RUNBOOK.md` warns, so the app's real queries fail against it.
- A Next dev **error overlay is present on the home page** (`nextjs-portal` count 1), and
  Trending Now never resolves — it sits on `Loading trending stories…` forever.
- Several local "passes" are therefore **vacuous**: `(b) old Spotlight logo is gone` and
  `(c) newsletter is not in the rail` pass because the local fixtures never render that
  content at all, not because anything was fixed. At least one (`no STAGING PREVIEW badges`) passed while the badge is demonstrably in the local DOM — i.e. it raced a page
  that never finishes loading.

**A test suite that can pass because the page failed to render is worse than no suite.**
Two consequences:

1. `tests/acceptance/mock-parity.spec.js` gets a **health gate** that runs before every
   assertion: the page must have no dev error overlay, and a known always-present anchor
   must be visible. If the page did not render, every requirement test fails loudly rather
   than passing vacuously.
2. **Gate 0's real job is bigger than "register four fields."** It has to make the local
   stack render the home page faithfully — the same missing custom WP PHP (§2.3) is both
   why c/f/g were hardcoded _and_ why the local loop can't render. Until Gate 0 lands,
   "test locally first" is not yet available to Jerome, and staging remains the only
   honest signal. That is a Gate-0 acceptance criterion, not a footnote: **the acceptance
   suite must produce the same verdict locally as against staging on the unchanged
   codebase.** If it doesn't, the harness is lying.

### Standing rules for this batch

1. **Prove it locally before staging.** Local Docker WP + `yarn dev` + the acceptance
   suite at `localhost:3000`. Staging confirms the deploy; it is not where you find out
   whether the feature works.
2. **Verify in a real browser's DOM, not in Jest.** All six gaps passed their unit tests.
   A task closes on an acceptance-suite pass plus a screenshot, not a green unit run.
3. **Assert deploy-topology bugs in the deploy verifier.** Anything that can only break
   in Lambda@Edge (routing, redirects, rewrites) needs an assertion in
   `scripts/verify-staging.js`, because no local run will ever catch it.
4. **No new `HECMEDIA_*_PREVIEW` flags.** The four existing ones are deletions T2–T4 owe.
   Env-gated half-features are what produced this outcome.
5. **Replace, don't append.** If a requirement says "replace X with Y", X is gone when the
   task closes.
6. **Re-read the client requirement text at close time,** not the ticket title. Both
   spec-drift bugs (b, f) would have been caught by this alone.
7. **Escalate blockers as blockers.** The missing ACF source should have blocked the epic
   on day one.
8. **Newsletter acceptance submits the rendered form without sending a subscription.** Keep
   direct HTTP 200 checks for both `/newsletter` and `/newsletter/thank-you`; separately
   fill and submit the real form in Playwright, intercepting **only**
   `/api/newsletter/subscribe` once with a synthetic success. The browser must navigate to
   `/newsletter/thank-you` and show its `Thank You` heading. Staging must be configured with
   Google's non-production reCAPTCHA v2 test site key (and matching test secret), never a
   production key, so the real widget can yield a test token. No other request may be mocked.
9. **Stale-logo checks identify the retired rail asset, not a word.** The regression selector
   is the image `/static/assets/spotlight-img.jpg` inside the
   `/posts/as-seen-on-spotlight` ProgramViewer rail link. The retained HEC-TV Spotlight list
   may legitimately contain Spotlight images and must not make the check fail.

---

## 5. Out of scope

Production deploy and the Payment 2 invoice stay gated on Jayne's written sign-off
(#68054 → #68055 → #68056 → #68057). Nothing here changes that ordering, and nothing here
touches `prod-wp.hectv.org`.
