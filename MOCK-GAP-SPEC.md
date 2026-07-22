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
`29896468330`), so the deployed bundle *is* current master. The client still reports the
site does not look done.

The audit below was run against the live staging DOM, not against the tickets. **One of
the seven client requirements is genuinely met.** The other six were closed against the
*ticket title* rather than the *client requirement text*, and every one of them shipped as
a hardcoded, env-flag-gated preview rather than a CMS-driven feature.

The tickets are not lying about what they built. They built something else.

---

## 2. Root cause

Three compounding causes, in order of importance:

**2.1 — Spec drift between the client requirement and the ticket title.**
Two features were re-scoped somewhere between the client list and the queue row:

| Client asked for | Ticket built |
|---|---|
| (f) adjust the **size of header images** on article pages | #68044 "Feature F — header **font** sizing" |
| (b) replace the Spotlight **logo** with a **new image and link** | #68042 "Feature B — Spotlight → 'For Educators' **rename**" |

Nobody re-read the client requirement at close time, so both closed green.

**2.2 — "Additive preview" instead of "replacement".**
Features C and G were added *next to* the thing they were supposed to replace, behind
`HECMEDIA_*_PREVIEW` env flags, with visible `STAGING PREVIEW` / `STAGING ONLY` badges.
The old UI was never removed. To the client this reads as "nothing changed, and now
there's a second half-built thing below it."

**2.3 — The real blocker nobody escalated: the ACF field source is unavailable.**
`dev-infra/wordpress/RUNBOOK.md` documents it plainly — the custom WP-side PHP that
registers `postDetails`, `requiredPosts`, `feedDesign`, `pageTemplate` etc. is not in this
repo or any repo available to us. Every requirement with the word *customizable*,
*manually feature*, or *adjust* (c, f, g) needs a CMS field to store the choice. With no
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
- Trending Now was appended *below* it, so the rail is now newsletter → Trending Now,
  instead of Trending Now replacing the newsletter.
- It renders a `STAGING PREVIEW` badge to the client.
- `document.querySelectorAll('[class*=trending] img').length === 0` — **no thumbnails.**
  The mock is a thumbnail list. Ours is a text list.
- Data source is wrong: `lib/trendingNow.js` maps `spotLightPosts`, and its own comment
  says so — *"temporary staging data source. Replace spotlightPosts with a dedicated
  WPGraphQL/ACF query when editorial support is available."* The requirement is **newest
  video posted, auto-populated**, plus **manual featuring**. Neither is implemented.

Note the mock keeps a separate **HEC-TV SPOTLIGHT** list *below* Trending Now. Trending
Now replaces the *newsletter*, not the Spotlight list.

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

| Mock | Staging |
|---|---|
| ABOUT · PROGRAMS · PRODUCTION SERVICES · WATCH NOW · READ NOW | WATCH · LEARN & EXPLORE · CONNECT · SUPPORT HEC MEDIA |

`lib/navigationPreview.js` is a hardcoded keyword-matcher that invents its own five
groups and buckets anything unrecognised into `CONNECT`. That is why *HEC Films*,
*Books*, *Genres* and *Business* are all filed under "Connect". The grouping must come
from the WordPress menu tree, not from a keyword list in our bundle.

### (f) Adjust header image size on article pages — ❌ **NOT DONE AT ALL**

Zero matches for `headerImage|imageSize|heroSize|featuredImageSize` across
`components/`, `pages/`, `lib/`. #68044 shipped responsive *font* sizing instead. This
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

| Req | Client requirement | Status |
|---|---|---|
| a | Sticky header | ✅ done |
| b | Replace Spotlight logo w/ new image + link | ❌ not done (built on an unrendered component) |
| c | Newsletter → Trending Now (auto-newest video + manual feature) | ❌ partial, wrong data, newsletter still present |
| d | Newsletter page → Thank You redirect | ⚠️ **404 in production** |
| e | Sub-dropdown menus | ❌ not done (one flat level) |
| f | Article header image sizing | ❌ no implementation |
| g | Customizable top-bar buttons | ⚠️ partial, hardcoded, one dead button |

---

## 4. Remediation plan

### Gate 0 — unblock the CMS layer (blocks c, f, g; do this first)

Ship a **checked-in mu-plugin we own**, `dev-infra/wordpress/mu-plugins/hectv-site-options.php`,
that registers the fields the remaining work needs and exposes them over both REST and
WPGraphQL. Owning the registration means we stop being blocked on the missing production
ACF source, and the same plugin file is what gets installed on the client's WP.

Fields to register:

| Field | Type | Serves |
|---|---|---|
| `hectv_rail_promo` (image, link, alt) | site option | (b) |
| `hectv_featured_videos` (ordered post refs, nullable) | site option | (c) manual featuring |
| `hectv_topbar_ctas` (repeater: label, url, style) | site option | (g) |
| `hectv_header_image_size` (enum: small/medium/large/full) | per-post meta | (f) |

Acceptance: each field is readable from `http://localhost:8091/graphql` **and**
`/wp-json/`, seeded with fixture values by `seed.sh`, and covered by an e2e test that
reads it through the real `store/api` module — the same bar `tests/e2e/rest/posts.e2e.test.js`
already meets. Build and verify against the **local Docker WP** (`dev-infra/wordpress/`,
worker-mba, port 8091) — never against `prod-wp.hectv.org`.

Note the local instance has no ACF and stubs `hectv/v1`. Do not extend the stub; register
real fields in the new plugin so the code path is the production code path.

### Then, in dependency order

**T1 — (d) Fix the Thank You 404.** *Highest priority — client-facing dead end.*
Add explicit `newsletter` routes to `route-list.json` (`/newsletter`,
`/newsletter/thank-you`). Add to `scripts/verify-staging.js` a hard assertion that
`/newsletter/thank-you` returns 200 on the deployed distribution, so this can never
regress silently. A Jest-green route that 404s in Lambda@Edge is exactly the class of bug
the deploy verifier exists to catch.

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
menu says it is. Configure the menu to the mock's five items (ABOUT, PROGRAMS,
PRODUCTION SERVICES, WATCH NOW, READ NOW) in the local WP, and hand Jayne the same menu
structure to apply in production.

**T4 — (g) Real customizable CTAs.**
Render from `hectv_topbar_ctas`. No hardcoded labels, no dead buttons, no
`STAGING ONLY` badge, no `HECMEDIA_TOPBAR_CTA_PREVIEW` flag. Seed with SUBSCRIBE /
SUPPORT / GET INVOLVED per the mock. A CTA with no URL is not rendered rather than
rendered dead.

**T5 — (b) Rail promo card.**
Replace the Spotlight logo in `components/SideNavigation` — **the component the home page
actually renders** — with the `hectv_rail_promo` image + link. Seed with the FOR
EDUCATORS notebook card from the mock. Verify in the staging DOM, not in Jest.

**T6 — (f) Article header image sizing.**
Consume `hectv_header_image_size` in the article template; four sizes; default preserves
today's rendering so existing posts don't shift. Editor-facing, per-post.

**T7 — Mock-parity QA pass.**
Side-by-side against the mock at desktop/tablet/mobile. No `STAGING PREVIEW` or
`STAGING ONLY` badge anywhere. Attach screenshots to the task before it closes.

### Standing rules for this batch

1. **Verify in the deployed DOM, not in Jest.** Every one of these six gaps passed its
   unit tests. A task closes on a staging DOM query or a screenshot, not a green suite.
2. **No new `HECMEDIA_*_PREVIEW` flags.** The four existing ones are deletions T2–T4 owe.
   Env-gated half-features are what produced this outcome.
3. **Replace, don't append.** If a requirement says "replace X with Y", X is gone when the
   task closes.
4. **Re-read the client requirement text at close time,** not the ticket title. Both
   spec-drift bugs (b, f) would have been caught by this alone.
5. **Escalate blockers as blockers.** The missing ACF source should have blocked the epic
   on day one.

---

## 5. Out of scope

Production deploy and the Payment 2 invoice stay gated on Jayne's written sign-off
(#68054 → #68055 → #68056 → #68057). Nothing here changes that ordering, and nothing here
touches `prod-wp.hectv.org`.
