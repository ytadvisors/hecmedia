# HEC Media same-day production release playbook

**Status:** Required process document for production deployment (co-signed attempt)

**Prepared:** 2026-08-06 · **Process lock:** 2026-08-07

**Decision owner:** Yomi Toba

**Execution policy:** Model-neutral; one commander per deployment; the commander's **right hand**
is a named representative from **each unflagged provider** on the release

**Selected commander for this trial:** Grok lane (`yt-agent-tom-grok`)

**Commander's right hand (this trial) — one rep per unflagged provider:**

| Provider | Right-hand rep | Role on this attempt |
| --- | --- | --- |
| xAI / Grok | `yt-agent-tom-grok` | Commander (also that provider's rep) |
| OpenAI / GPT | `yt-agent-tom-gpt` | Right-hand rep — launch coordination + GO/NO-GO |
| Anthropic / Claude | `yt-agent-kronos-grok` (or seated kronos-*) | Right-hand rep — foreign co-sign / jury |

**Systems:** `ytadvisors/hecmedia`, `ytadvisors/hectv-wp`, AWS account `850335719356`

**Cross-communication surface:** this playbook file on `master` (and open PRs that update it).
Chat, Discord, and queue tasks are secondary; they do not replace playbook signoff or the living
deployment log in section 18.

## 1. Objective

Release the reviewed HEC Media frontend and WordPress backend today without repeating the
2026-08-06 schema-ordering incident or promoting the corrupted staging image. The release must
remain reversible at each boundary, and every go/no-go decision must be based on real WordPress,
GraphQL, REST, SSR, and browser checks—not the static container health file alone.

The target is a same-day release, not a bypass of failed gates. If a stop condition is reached,
the deployment stops at the last verified compatible pair.

## 2. Non-negotiable controls

1. Execution is model-neutral. At Gate 0, Yomi names exactly one **deployment commander** and
   the commander's **right hand**: a named representative from **each unflagged provider**
   participating in the release. For this trial the commander is Grok (`yt-agent-tom-grok`);
   right-hand reps include OpenAI/GPT (`yt-agent-tom-gpt`) and Anthropic (`yt-agent-kronos-grok`
   or the seated kronos lane), provided those providers are unflagged. Only the commander
   dispatches or mutates production. Right-hand reps coordinate, co-sign, prepare/review evidence,
   and post GO/NO-GO; they do not dispatch.
2. **Commander and right-hand provider reps coordinate the release.** They share the playbook
   surface (section 18), agree frozen inputs, and require the right-hand panel's GO (or recorded
   dissent resolved by Yomi) on each production receipt before Yomi is asked for protected-
   environment approval. Disagreements among right-hand reps are stop conditions until resolved or
   Yomi rules.
3. **The commander's right hand is one rep from each unflagged provider.** “Provider” means each
   model provider family on the fleet production path (e.g. xAI/Grok, OpenAI/GPT, Anthropic/Claude)
   that is **not** currently flagged for billing, auth, quota, or other production-blocking faults
   (see queue-worker provider flags / `/control/flags`). Flagged providers are out of the right-hand
   panel for that attempt until cleared; they neither seat a right-hand rep nor block Gate 0 by
   absence. The commander's own provider must be unflagged (or Yomi records an explicit override in
   §18). An **unflagged** provider without a named right-hand rep may not silently share command;
   that missing seat is a Gate 0 failure.
4. Yomi provides the final go/no-go and the independent protected-environment approval.
5. **No production dispatch without a co-signed playbook.** The exact playbook commit (or a
   co-signed amendment commit) must carry Yomi approval plus at least two independent model-family
   approvals, including one family other than the selected commander. A chat-only “GO” does not
   authorize production. Signoff lives on the playbook PR/commit (and, for each receipt, on the
   living deployment log in section 18).
6. **Deployment progress is documented in this playbook.** The named commander updates section 18
   (Deployment log) via branch → PR → merge as gates open, receipts are dispatched, GO/NO-GO
   decisions land, environments are approved, and cutovers complete or roll back. Other lanes
   propose amendments the same way. Queue/Discord may notify; the playbook is the durable record.
7. Production changes run only through the governed GitHub workflows. No workstation production
   deploy, direct CloudFront cutover, or direct ECS release is part of this playbook.
8. Every release input is immutable: exact merged SHA, image digest, CloudFront ETag, versioned
   Lambda ARN, Lambda checksum, current ECS task definition, and current image digest.
9. The backend release is expand/contract. It must preserve the schema used by the currently
   deployed frontend while exposing the new schema. Legacy fields are not removed today.
10. Staging must exercise the same GraphQL compatibility profile as production. Environment-only
   staging resolvers may not make an otherwise incompatible backend appear safe.
11. Image integrity is verified independently of Docker/ECR success. The known-bad digest
   `sha256:beba7812ee56969a4646d09c5afb01ccef4d525e8e5968e2307b140fab664a83`
   is quarantined and must never be promoted.
12. Static `/healthz` proves only that the container and Apache are reachable. It is not an
   application release gate.
13. No database DDL change is included in this release. The required additive GraphQL API-contract
   expansion remains in scope. If database DDL becomes necessary, stop and follow the replicated-PG
   subscriber-first invariant in a separate reviewed plan.## 3. Verified recovery baseline

This is the state to preserve until the release reaches its next explicit gate.

| Surface | Verified state at 2026-08-06 17:46 CT |
| --- | --- |
| Public site | `https://hecmedia.org` returns HTTP 200 with title `HEC-TV \| Home` |
| Production frontend | CloudFront `E2QXRSF2W55RTS`; ETag `E2YN27AV1NE3XR`; Lambda@Edge `x2l4ew-l5vb7pd:146`; code SHA `5CzpPZ0xXqsNoDJ+Nr8mzRuY9kUKNkIKF6bovFjKsS4=` |
| Newsletter edge behavior | Absent (`none`) |
| Production frontend rollback | Immutable sanitized Lambda version `150`, verified by the governed workflow before cutover |
| Production backend | ECS task definition `hectv-wp-production-rollback-pr34-safe:3`; 4 desired / 4 running / 0 pending; rollout complete |
| Production backend image | `sha256:b0764544d2a46fa51e2a325b181d53bb66a251cb354090b10ba1d6955dc38d36`; source label `d0b939ec0186a23e4ce10014aeaf10c738af7b59` |
| Staging frontend | `https://development.hecmedia.org`; Lambda@Edge `mf64oua-5ao6wt:172`; deployed SHA metadata `025a5b5b8b8217705fbe5478d026e75d56616142` |
| Staging backend | Public and admin services on task definition revision `:32`; 1/1 each; rollout complete |
| Staging backend image | `sha256:e7a885f156a60e6e1425c1c7ef12682cf22383b23b2fb9d92c1b7ebbb3907bd3`; source label `f940fdfe94e595860198829cd6dfd50bb3f73f30` |
| Recovery evidence | Production passed 20/20 cache-busting homepage requests; staging GraphQL, REST, and rendered frontend returned HTTP 200 |
| AWS month-to-date cost | `$331.57` through 2026-08-05, below the `$1,250` cap |

Current repository tips before this documentation PR:

- Frontend `master`: `48500c33269dafc2a3e657949e380bcf891772b8`
- Backend `main`: `84919f0d918db9149d8c042b4df93573ea27988a`

These are inventory values, not authorized deploy inputs. The final release SHA is captured only
after all required fixes and documentation are reviewed and merged.

### Pre-deployment capacity and builder assessment

Read-only checks on 2026-08-06 found enough raw disk capacity for a clean build, but the existing
default Colima builder is quarantined:

| Check | Observed | Decision |
| --- | --- | --- |
| macOS data volume | 40 GiB available of 228 GiB | Capacity pass |
| Colima Docker data volume | 54 GiB available of 59 GiB | Capacity pass |
| Docker images | 2.691 GB total; 433.9 MB reclaimable | Informational |
| Docker build cache | 2.538 GB total; 1.302 GB reclaimable | Do not reuse |
| Active Docker workload | 0 containers and 0 volumes | Capacity pass |
| Default Colima filesystem | Prior I/O failure; ext4 marked as needing `e2fsck`; error count 3 | Builder fail / quarantined |

Capacity is therefore **GO**, while the default Colima builder is **NO-GO**. The release build must
use a newly created isolated Colima profile or a reviewed remote builder that inherits neither the
damaged data disk nor its BuildKit cache. Do not run a release build merely because `docker build`
starts successfully.

Before the build, record all of the following in the evidence package:

- at least 20 GiB free on the host and 20 GiB free on the selected builder volume;
- selected builder identity, filesystem health, architecture, Docker root, and cache inventory;
- no cache inherited from the quarantined default Colima profile;
- the exact source SHA and base-image resolution used by `--pull --no-cache`.

After build and post-pull verification, require at least 10 GiB host free. Any filesystem I/O,
journal, ENOSPC, BuildKit metadata, or containerd error is an immediate stop: discard the candidate
and the builder cache, preserve diagnostics, and restart Gate 2 on another pristine builder.

## 4. Known blockers that must be closed

| ID | Blocker | Required closure evidence |
| --- | --- | --- |
| B1 | Backend `f940fd…` removed fields still queried by the live frontend in production | A production-safe dual-schema compatibility PR plus consumer-contract tests |
| B2 | Staging enabled a compatibility layer that production disabled | Identical explicit schema-profile configuration in staging and production, proven in task-definition evidence |
| B3 | Candidate image `beba781…` contains zero-byte WordPress core files | A new image built on a pristine builder; nonzero files and WordPress checksums verified before push and after pull |
| B4 | ECS health checks only a static file | Application probes must gate staging and production rollout; static health remains infrastructure-only |
| B5 | Current production frontend artifact has no trustworthy source-SHA metadata | Record Lambda version `146` and checksum as the live/pre-cutover identity; verify sanitized version `150` and its pinned checksum as the sole rollback target; require source SHA metadata in the candidate |
| B6 | Backend-first ordering broke SSR | Default path is four-way matrix pass + frontend-first. **Exception (this trial):** if Cell 2 (candidate FE × current production backend) fails because the candidate requires modern fields the recovery backend lacks, and Cells 1/3/4 pass with dual-schema expand, production may land the dual-schema **backend expand first**, then the candidate frontend — only after co-signed amendment + Yomi go |
| B7 | Fresh requests can fail while cached requests look healthy | Verification uses unique query strings, multiple sequential requests, hydrated Chrome routes, and edge-log inspection |

## 5. Release strategy

Use an **expand (merge only; do not deploy) → validate → deploy consumers safely →
contract later** sequence.

### Default path (Cell 2 passes)

1. Merge the backend contract expansion so it supports both the live frontend's legacy GraphQL
   operations and the candidate frontend's modern operations, but do not deploy it yet.
2. Prove the exact candidate frontend against both old and expanded backend contracts.
3. Deploy the backward-compatible frontend first.
4. Deploy the expanded backend second.
5. Remove legacy fields only in a later release after production telemetry proves they are unused.

### Exception path — Cell 2 fails (this trial, co-signed)

When the **candidate frontend is not backward-compatible** with the current production backend
(Cell 2 fails — e.g. candidate requires `trendingSettings` / `topbarCtas` that recovery prod lacks)
**and** all of the following hold:

- Cell 1 passes (live FE × current production backend);
- Cell 3 passes (live FE contract / Lambda 146 ops × candidate dual-schema backend in staging);
- Cell 4 passes (candidate FE ops × candidate dual-schema backend in staging);
- dual-schema expand is proven not to break live Lambda 146 fields (`PostToCategoryConnectionWhereArgs.shouldOutputInFlatList`, `Event.excerpt`, etc.);
- this exception is recorded in the evidence package and co-signed (Yomi + two independent model families on the exact amendment commit);

then production cutover is:

1. **Deploy dual-schema backend expand first** (provider expand; live FE continues).
2. Verify production GraphQL dual-schema + live public site (20/20 fresh probes, no schema errors).
   The frontend preflight must also resolve the exact image URLs produced by the application for
   the current Spotlight rail and at least ten posts from a representative category. Every probe
   must return an `image/*` response; a valid GraphQL URL that returns 404 is a release blocker.
3. **Deploy candidate frontend second**.
4. Soak; remove legacy fields only later.

This is still expand/contract. It is **not** a blank backend-first for incompatible modern-only backends without dual-schema proof.

## 6. Roles and communications

| Role | Responsibility |
| --- | --- |
| Yomi | Approves this plan, names the commander and the right-hand panel (one rep **per unflagged provider**), selects final go/no-go, and approves the protected production environments |
| Deployment commander | Owns dispatch authority for the attempt: command log, baselines, governed `workflow_dispatch`, rollout monitor, rollback invoke; for this trial Grok (`yt-agent-tom-grok`) |
| Commander's right hand | **One named rep from each unflagged provider** on the release. Together they coordinate with the commander: pre-flight review, GO/NO-GO on each production receipt, §18 co-authorship, stop-condition calls. Right-hand reps do **not** dispatch production unless Yomi reassigns command. This trial (all unflagged): OpenAI `yt-agent-tom-gpt` + Anthropic `yt-agent-kronos-grok` (plus commander as xAI/Grok provider rep) |
| Provider representatives | Identical to the right-hand panel: every **unflagged** provider has exactly one named seat recorded at Gate 0 and in §18. Flagged providers are listed as out-of-panel with the flag reason |
| Backend change author | Implements the production-safe dual-schema layer and application-readiness check through branch → PR → merge |
| Frontend change author | Ensures candidate operations tolerate both backend contracts and preserves no-write test behavior |
| Independent reviewers / foreign co-sign | Review code, plan, immutable inputs, test evidence, and stop conditions; supply foreign-family approval for co-sign/jury; no production mutation |
| Incident scribe | Records timestamps, workflow URLs, SHAs, digests, task definitions, Lambda versions, invalidations, probe results, and decisions into **section 18** of this playbook (and the evidence package) |

The commander and the right-hand **unflagged-provider reps coordinate the release** as a panel.
One named commander still owns each dispatch call so concurrent executors cannot race. Parallel
operators must not dispatch independent workflows or make overlapping AWS changes. A co-signed
playbook authorizes execution only inside its exact action envelope; it does not grant credentials
or permit deviations.

**Required communications path for production work**

1. Propose or update the playbook (this file) with the exact step, immutable inputs, and receipt.
2. Obtain approved signoff (Yomi + right-hand reps from each unflagged provider) on that commit
   or amendment.
3. Commander and right-hand unflagged-provider reps align on the receipt (each seated provider's
   GO/NO-GO recorded on §18 or the PR; all required right-hand seats must GO, or Yomi records an
   override).
4. Only after the right-hand panel GO (unless Yomi explicitly overrides in §18): commander
   dispatches the governed workflow named in the playbook for that step.
5. Immediately document the dispatch, waits, approvals, outcomes, and stop/rollback decisions by
   updating section 18 through a follow-up PR (or the same open process PR if still unmerged).
6. Secondary channels (Discord, queue) may alert humans; they do not replace playbook signoff, the
   commander + per-unflagged-provider right hand, or the deployment log.

### Executor-neutral hypothesis trial

**Hypothesis:** once this deterministic playbook is co-signed, safe execution depends on the gates,
immutable inputs, governed credentials, and stop conditions—not on the commander's model family.

The playbook is co-signed when Yomi approves it and at least two independent model families record
approval of the same commit, including at least one family other than the selected executor's. A
review of an earlier commit does not count. Co-signing authorizes execution only after every P0 and
Gate 0–3 condition is evidenced.

This Grok-led trial succeeds when:

- Grok is the only lane that dispatches or mutates staging/production for the attempt;
- the commander's right hand is one rep from each unflagged provider (this trial: OpenAI + Anthropic; xAI/Grok via commander);
- every unflagged provider has that named right-hand seat on the attempt; flagged providers are recorded as out-of-panel;
- every command and decision maps to a numbered playbook step;
- every immutable input, approval, probe, soak, and output is captured in the evidence package;
- no stop condition is bypassed, and any triggered rollback follows section 14 before diagnosis;
- an independent post-run reviewer can reconstruct the release without relying on chat history.

A correct stop or rollback is evidence that the playbook worked; it is not automatically a failed
trial. An undocumented deviation, concurrent executor, missing approval, or unreviewed substitution
invalidates the trial and immediately ends the playbook's authorization.

## 7. Phase 0 — review and release lock

1. Obtain review approval for this playbook and the incident RCA.
2. Confirm there are no active frontend or backend production workflow runs.
3. Confirm production remains on the recovery baseline in section 3.
4. Create or confirm a positive queue-task receipt covering this exact release attempt.
5. Announce a release lock: no unrelated merge to frontend `master` or backend `main` from candidate
   freeze through final verification.
6. Record UTC and CT start times in the evidence directory.

**Gate 0:** Yomi approves the exact co-signed playbook commit and names the deployment
**commander** and the commander's **right hand** — one representative from **each unflagged
provider** on the release. Record any flagged providers as out-of-panel with reason. For this
trial (providers unflagged): commander = Grok (`yt-agent-tom-grok`); right-hand panel = OpenAI
(`yt-agent-tom-gpt`) + Anthropic (`yt-agent-kronos-grok` / seated kronos); xAI/Grok provider seat
held by the commander.

## 8. Phase 1 — repair the backend contract

Create a backend PR based on current `main` that includes all of the following:

1. Preserve the legacy GraphQL fields used by the live Lambda version `146`, including the exact
   category/post filtering and event fields observed in Lambda@Edge errors.
2. Preserve the modern WPGraphQL contract required by the candidate frontend.
3. Replace the implicit `HECTV_ENVIRONMENT=staging` schema difference with an explicit,
   production-safe compatibility profile. The candidate uses the same profile in staging and
   production.
4. Retain the merged REST-without-ACF fix from backend PR #58 and Guzzle security update from PR
   #57.
5. Add consumer-driven tests using the actual GraphQL documents from `hecmedia/lib/graphql.js`,
   not hand-written approximations.
6. Add an application readiness probe that boots WordPress and performs a read-only DB/API check.
   It must never send mail, charge payments, write content, or depend on a static file.
7. Keep schema removal out of this release.

Required checks:

- Composer validation and exact install
- PHP lint and PHPUnit/standalone test suite
- no-sensitive-artifacts test
- legacy frontend GraphQL contract suite
- modern frontend GraphQL contract suite
- REST posts response includes valid JSON and optional thumbnail behavior without ACF
- production-profile and staging-profile schema fingerprints are identical for consumer fields

**Gate 1:** backend PR is approved, merged, and has a new exact `main` SHA. Do not use
`84919f0d…` directly if the compatibility work produces a later SHA.

## 9. Phase 2 — build on a pristine builder

The local Docker cache involved in the disk-full incident is not trusted.

1. Re-run the capacity and filesystem checks above. Use a new isolated Colima profile or reviewed
   remote builder with no disk or cache inherited from the damaged default Colima profile.
2. Build from `git archive <exact-merged-sha>` with `--pull --no-cache`, `linux/arm64`, and
   provenance settings required by the current runtime.
3. Before push, run at least:

   ```bash
   test -s /var/www/html/index.php
   test -s /var/www/html/wp-blog-header.php
   test -s /var/www/html/wp-load.php
   test -s /var/www/html/wp-settings.php
   php -l /var/www/html/wp-config.php
   php -l /var/www/html/wp-content/mu-plugins/hectv/hectv_admin.php
   ```

4. Verify WordPress core files against the pinned WordPress release checksum set.
5. Start the image with an isolated test database and prove GraphQL and REST return non-empty JSON.
6. Push an immutable staging tag equal to the exact merged SHA.
7. Resolve and record the ECR digest.
8. Pull the image back from ECR by digest on a second clean context and repeat the file-integrity
   and API checks. Verification of the local pre-push image alone is insufficient.
9. Verify ARM64 architecture and `org.opencontainers.image.revision` equals the merged SHA.

**Gate 2:** independent reviewer confirms the post-pull image evidence. The digest `beba781…`
is explicitly rejected.

## 10. Phase 3 — production-parity preproduction validation

This phase proves every compatibility-matrix cell through a named mechanism before production.
Evidence from one pairing may not be reused as proof of another.

1. Snapshot both staging services, task definitions, image digest, target health, frontend Lambda
   version, CloudFront ETag, and `staging-last-known-good` before mutation. Recapture the current
   production frontend version/checksum and backend task definition/digest.
2. Reconfirm the current/current baseline with the captured legacy GraphQL operations, fresh REST
   probes, fresh SSR routes, and hydrated routes against the recovered production pair.
3. Prove the candidate frontend against the current production backend before changing backend
   staging:

   - verify in workflow evidence that the governed frontend staging build uses the read-only
     `https://prod-wp.hectv.org/graphql` and `https://prod-wp.hectv.org` endpoints;
   - require `E2E_ALLOW_WRITES=0`, no-send forms, and the production-host write guard;
   - deploy the exact merged frontend candidate to `development.hecmedia.org` through the governed
     staging workflow;
   - verify server-rendered and hydrated routes: `/`, `/events`, `/about-us`, `/newsletter`,
     `/newsletter/thank-you`, `/category/films`, and `/category/arts/two-on-the-aisle`;
   - run 20 unique cache-busting homepage requests sequentially and require 20/20 HTTP 200, valid
     `HEC-TV` titles without `undefined`, non-empty bodies, and exact candidate SHA metadata.

   If the effective CMS endpoints differ from the captured current production endpoints, stop;
   this matrix cell has not been tested.
4. Register new public and admin backend task-definition revisions by changing only the image
   digest and reviewed explicit schema-profile variable. Diff the entire task definition against
   the baseline.
5. Deploy both backend staging services with ECS rolling replacement and wait for completed
   rollouts.
6. Verify the new tasks—not a mixture—are the only registered healthy targets.
7. Run candidate-backend application probes:

   - `POST /graphql` returns JSON and `generalSettings.title = "HEC Media"`
   - all legacy and modern consumer GraphQL documents return without schema errors
   - `GET /wp-json/wp/v2/posts?per_page=1` returns non-empty JSON
   - representative menus, pages, events, schedules, and media queries return their expected shapes
   - prohibited writes remain blocked on public staging
   - admin service authentication and editor routing are unchanged

8. Run the immutable operation bundle captured from live Lambda version `146` against the candidate
   backend. Require every legacy document and response shape to pass. This proves the current
   frontend-contract/candidate-backend cell without changing production.
9. Prove the candidate frontend against the candidate backend using an isolated exact-candidate SSR
   harness on a clean runner:

   - check out the same merged frontend SHA and lockfile used in step 3;
   - use the same Node runtime, install, lint, test, and production build commands as the governed
     staging workflow;
   - change only `APOLLO_CLIENT_URI` and `WP_HOST` to the candidate staging backend, retain
     `E2E_ALLOW_WRITES=0` and no-send forms, and record the effective non-secret endpoint hostnames;
   - serve the production build locally on the isolated runner and repeat the required SSR,
     hydration, 20/20 cache-busting, API-contract, and empty-body checks.

   A unit-only contract suite is insufficient for this cell. The exact candidate build must render
   against the candidate staging backend.
10. Inspect frontend staging, SSR-harness, and backend logs for schema, PHP, uncaught JavaScript,
    empty-body, and 5xx errors.

### Required compatibility matrix

| Frontend | Backend | Required proof before Gate 3 |
| --- | --- | --- |
| Current production frontend baseline | Current production backend `d0b939…` | Fresh recovered-production probes and captured legacy operations pass |
| Candidate frontend | Current production backend `d0b939…` | Governed `development.hecmedia.org` deployment uses the verified read-only production CMS endpoints and passes SSR/hydration/20-request checks |
| Current production frontend contract | Candidate dual-schema backend | Immutable Lambda `146` operation bundle passes against candidate backend staging |
| Candidate frontend | Candidate dual-schema backend | Exact-candidate isolated production build passes SSR/hydration/20-request checks against candidate backend staging |

The current production Lambda has no reliable source-SHA metadata, so its contract is represented
by its immutable version/checksum plus captured operations and edge logs. The candidate must embed
its exact SHA. Lambda version `146` is the live/pre-cutover identity only. The sole governed
frontend rollback target is sanitized version `150` with its pinned checksum; rollback uses `150`
instead of inferring or re-associating `146` so the workflow can verify one immutable artifact and
restore the no-newsletter-API configuration deterministically.

**Cell 2 failure handling:** If Cell 2 fails and Cells 1/3/4 pass under dual-schema, stop the
default FE-first path and use §5 Exception path (backend expand first). Record the failed Cell 2
evidence; do not invent a pass. Gate 3 may still close for the exception path only when that
evidence package is co-signed.

**Gate 3:** all four matrix cells pass **or** Cells 1/3/4 pass with documented Cell 2 failure and
co-signed §5 Exception path. Yomi reviews the evidence and explicitly approves proceeding.

## 11. Phase 4 — freeze immutable production inputs

Immediately before dispatch, the named deployment commander records fresh values:

### Frontend

- exact protected `master` SHA
- CloudFront distribution `E2QXRSF2W55RTS` ETag
- current default Lambda@Edge version ARN and `CodeSha256`
- current newsletter API Lambda ARN or literal `none`
- sanitized rollback version `150` checksum verification
  (`InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag=`); this immutable version is a
  protected deployment dependency and must not be deleted while pinned by the workflow
- positive queue-task receipt
- confirmation phrase `DEPLOY HEC FRONTEND PRODUCTION`

### Backend

- exact protected backend `main` SHA
- exact staging ECR artifact digest that passed Gate 3
- current production ECS task-definition ARN
- current production image digest
- positive queue-task receipt
- confirmation phrase `DEPLOY HEC BACKEND PRODUCTION`

If any value changes between capture and protected-environment approval, cancel the run and
recapture. Do not edit inputs in place or guess a replacement.

## 12. Phase 5 — production cutover

### Default: deploy frontend first


1. The named deployment commander dispatches `.github/workflows/production-deploy.yml` from the
   exact protected `master` tip with the frozen inputs.
2. Confirm authorization and the dedicated no-credential media preflight pass before approving the
   protected environment. That preflight probes the exact Spotlight and category-card image URLs
   resolved by the candidate code. The protected job reruns the full no-credential test suite
   before it receives AWS credentials.
3. Yomi reviews the frozen inputs and approves the production environment.
4. Let the governed workflow package artifacts, publish versioned Lambda functions, update the
   existing CloudFront distribution, wait for propagation, invalidate, and run its verifier.
5. Do not dispatch the backend while CloudFront is deploying.
6. After workflow success, the named deployment commander verifies:

   - CloudFront associations point only to the new versioned Lambda ARNs
   - the exact candidate SHA appears in rendered metadata
   - all required routes return HTTP 200
   - titles are valid and never contain `undefined`
   - newsletter GET returns 405 JSON and an invalid POST returns 400 JSON without enrollment
   - 20/20 unique cache-busting homepage requests pass
   - hydrated Chrome routes contain no 404 or uncaught errors
   - hydrated Chrome content routes render managed upload media (including `srcset` candidates),
     every rendered remote image URL returns successfully, and utility routes may record an empty
     inventory; store the route-to-image inventory as release evidence
   - Lambda@Edge logs contain no new schema or rendering errors

7. Soak for 10 minutes with sequential, low-rate probes.

**Gate 4:** candidate frontend is healthy against the old production backend. If it fails, execute
the frontend rollback in section 14 and stop the release.

### Exception: dual-schema backend expand first (Cell 2 failed)

Use only when §5 Exception path is co-signed and Gate 3 closed under that path.

1. Freeze immutable production inputs (backend digest, current TD/image, queue receipt,
   `DEPLOY HEC BACKEND PRODUCTION`).
2. Confirm no concurrent production workflow runs (cancel or document terminal state of any zombie).
3. Dispatch the governed backend production workflow with the dual-schema staging digest.
4. Yomi approves the protected `production` environment.
5. After rollout, require dual-schema GraphQL probes (legacy flat-list + modern
   `trendingSettings` / `topbarCtas`), `/readyz.php` when exposed, and 20/20 public homepage probes.
6. Only then proceed to candidate frontend production deploy (Phase 5 default steps against the
   expanded backend).

## 13. Phase 6 — deploy backend second (default path only)


1. Recapture production ECS task definition and image digest after the frontend soak.
2. The named deployment commander dispatches the backend governed production workflow with the
   exact merged SHA, proven staging digest, recaptured baseline, queue-task receipt, and
   confirmation phrase.
3. Yomi reviews and approves the protected production environment.
4. Monitor the ECS circuit-breaker rollout until only candidate tasks are registered and healthy.
5. Require real application checks during rollout, not only target-group health:

   - legacy and modern GraphQL documents
   - REST posts JSON
   - homepage and representative SSR routes with unique query strings
   - hydrated browser routes
   - backend PHP logs and Lambda@Edge error logs

6. After rollout completion, run 20/20 cache-busting public requests and a 15-minute soak.
7. Confirm the production frontend still reports the exact candidate SHA and production ECS uses
   only the authorized digest.

**Gate 5:** frontend and backend are both verified, evidence is downloaded, and Yomi accepts the
release outcome.

## 14. Rollback playbook

### Frontend failure before backend deployment

1. Stop; do not dispatch the backend.
2. Use the governed frontend workflow with `action=rollback` and confirmation
   `ROLLBACK HEC FRONTEND PRODUCTION`.
3. Verify pinned sanitized Lambda version `150`, CloudFront deployment, completed invalidation,
   homepage, hydrated routes, and edge logs.
4. Record the failed candidate Lambda versions but do not infer rollback as version N-1.

### Backend failure after frontend deployment

1. Trigger the backend workflow's rollback to the frozen baseline task definition and digest.
2. Wait until only baseline tasks are registered and healthy.
3. Re-run GraphQL, REST, fresh SSR, and hydrated checks.
4. Keep the candidate frontend only if Gate 4 proved it compatible with the baseline backend.
5. If the frontend also fails, invoke the governed frontend rollback after backend recovery.

### Immediate stop/rollback signals

- any fresh public 404 or 5xx
- any GraphQL schema error
- empty GraphQL/REST body despite HTTP 200
- title contains `undefined`
- candidate SHA/digest does not match the authorized value
- CloudFront ETag or Lambda baseline drift
- ECS failed task or circuit-breaker rollback
- uncaught hydrated-browser error
- newsletter behavior sends or accepts an invalid request
- rollback target/checksum cannot be independently verified

Do not troubleshoot in place while an incompatible production pair is serving. Restore the last
known-compatible pair first.

## 15. Evidence package

The release is not complete until the following are stored under the executor's absolute
`~/.openclaw/workspace-<agent>/deliverables/hecmedia/` path and GitHub artifacts where supported:

- approved playbook and review URL (co-signed commit)
- section 18 deployment log entries for every production receipt (dispatch → approve → outcome)
- final frontend and backend SHAs
- image tag, ECR digest, architecture, label, core-file checksums, and post-pull test results
- staging before/after task definitions and full diff
- four-way compatibility matrix results
- staging and production workflow URLs
- protected-environment approval timestamps
- CloudFront before/after configs and ETags
- Lambda versions and checksums
- ECS before/after/rollback task definitions and image digests
- invalidation IDs and completion status
- 20-request probe results and hydrated browser artifacts
- relevant backend and Lambda log queries
- final go/no-go and rollback decisions

Verify the local evidence directory with `ls -la` before reporting completion.

## 16. Same-day schedule estimate

| Work | Expected elapsed time after review starts |
| --- | --- |
| Review, compatibility fix, and merge | 45–90 minutes |
| Pristine rebuild and independent image verification | 20–35 minutes |
| Production-parity staging and compatibility matrix | 35–60 minutes |
| Frontend production workflow, propagation, and soak | 35–55 minutes |
| Backend production rollout and soak | 25–40 minutes |
| Evidence closeout | 10–15 minutes |

Expected total: approximately 2.5–4 hours after reviewers begin, assuming every gate passes on the
first attempt. A failed gate pauses the clock; it does not authorize a bypass.

## 17. Reviewer decision record

Reviewers should explicitly answer:

- [ ] Is the dual-schema expand step sufficient for Lambda version `146` and the candidate?
- [ ] Is staging's schema profile demonstrably identical to production's candidate profile?
- [ ] Is the replacement image built and post-pull verified on a pristine builder?
- [ ] Do all four compatibility-matrix cells pass?
- [ ] Are rollback targets immutable and verified?
- [ ] Is one deployment **commander** named?
- [ ] Is the commander's **right hand** seated as one named rep from **each unflagged provider**?
- [ ] Are flagged providers listed out-of-panel (not silently omitted without reason)?
- [ ] Are all non-commander right-hand reps confirmed non-dispatching (coordinate/review/GO only)?
- [ ] Do Yomi and at least two independent model families approve this exact commit, including one
      family other than the selected commander's?
- [ ] Is the queue-task receipt valid for this exact attempt?
- [ ] Go / no-go decision recorded by Yomi?
- [ ] Is section 18 updated for every production receipt (or is an open PR doing so)?
- [ ] Are GO/NO-GO and env approvals recorded on the playbook surface, not only in chat?

## 18. Deployment log (living record)

This section is the **required cross-communication surface** for the production attempt. The
commander (and co-signing lanes via PR) append dated entries here as the release moves. Do not
consider a production step complete until its outcome is recorded here and the evidence package
paths are listed.

### Process (going forward)

| Rule | Requirement |
| --- | --- |
| Before any production `workflow_dispatch` | Co-signed playbook (or amendment) authorizes the step; **commander** named; **right-hand rep from each unflagged provider** listed; flagged providers noted out-of-panel |
| Signoff | Yomi + right-hand unflagged-provider panel (foreign-family coverage as required) on the authorizing commit |
| Launch coordination | Commander + per-unflagged-provider right hand agree; each required right-hand GO/NO-GO on the receipt recorded on §18/PR before Yomi env |
| During deployment | Update this log for every receipt: inputs, run URL, waits, GO/NO-GO, env approvals, probes |
| After cutover or rollback | Closeout entry with SHAs, digests, probe summary, and stop/rollback decisions |
| Forbidden | Production mutation justified only in chat; silent progress; approving zombie or stale receipts |

### Attempt: dual-schema backend expand first (Cell 2 exception) — 2026-08-07

| Field | Value |
| --- | --- |
| Playbook path | §5 Exception · Phase 5 Exception (backend expand first) |
| Commander | `yt-agent-tom-grok` (xAI / Grok) |
| Right hand (per unflagged provider) | xAI/Grok: commander · OpenAI: `yt-agent-tom-gpt` · Anthropic: `yt-agent-kronos-grok` |
| Flagged providers (out-of-panel) | none recorded for this attempt (confirm live via worker flags before launch) |
| Coordination | Commander + full right-hand panel of **unflagged** providers; no substitute that skips an unflagged provider |
| Co-sign amendments | hecmedia #258 (executor-neutral), #259 (Cell 2 backend-first) MERGED |
| Gate 1 | hectv-wp #61 merged → `bbac1c02b06b60aa3884734db9c9a476215f3820` |
| Gate 2 image | `sha256:12cf1fb5a0977b96987d2501f654b56d843f4e561288c57a2203ed893dcdb796` (WP 7.0.2 MD5 3501/3501) |
| Gate 3 | Staging `:34`; Cell 2 FAIL; Cells 1/3/4 PASS |
| Auth task | `86661` |
| Confirmation | `DEPLOY HEC BACKEND PRODUCTION` |
| Expected prod baseline TD | `arn:aws:ecs:us-east-2:850335719356:task-definition/hectv-wp-production-rollback-pr34-safe:3` |
| Expected prod baseline image | `sha256:b0764544d2a46fa51e2a325b181d53bb66a251cb354090b10ba1d6955dc38d36` |

#### Receipt log

| UTC | Event | Detail |
| --- | --- | --- |
| 2026-08-07T00:09Z | Stale expand cancelled | Run `31133641279` cancelled after GPT NO-GO (missing co-sign / Gate2 checksum / zombie hygiene) |
| 2026-08-07T00:45Z | Co-signs landed | #258, #259 merged on `master` |
| 2026-08-07T00:56Z | Fresh backend expand dispatched | Run **[31136386999](https://github.com/ytadvisors/hectv-wp/actions/runs/31136386999)** · SHA `bbac1c02…` · digest `12cf1fb5…` · actor `yt-agent-tom-grok` |
| 2026-08-07T00:57Z | Authorize success | `deploy-and-verify` waiting on protected env `production` (reviewer: `ytwguru` only) |
| 2026-08-07T01:50Z | **OpenAI right-hand GO** | `yt-agent-tom-gpt` on #260 head `2251475`: Launch coordination receipt **31136386999** → **GO** (env approve only that run; frozen SHA/digest) |
| 2026-08-07T01:53Z | Process policy on master | hecmedia **#260 MERGED** (`1fba22a`) |
| 2026-08-07T~now | **Anthropic right-hand GO** | `yt-agent-kronos-grok` revalidated run + staging dual-schema → **GO** on receipt **31136386999** |
| *open* | **Awaiting Yomi env approval** | Right-hand panel (unflagged providers) **GO** complete. Yomi: Approve protected `production` on [31136386999](https://github.com/ytadvisors/hectv-wp/actions/runs/31136386999) **only**. Never zombie [31128179764](https://github.com/ytadvisors/hectv-wp/actions/runs/31128179764) |
| *pending* | FE production | After backend success + dual-schema GraphQL verify; separate receipt + section 18 entry |

#### Never approve

- Zombie production run `31128179764` (head `f940fd…`) — API-uncancellable ghost; no waiver path
- Cancelled receipt `31133641279`

#### Evidence root

`~/.openclaw/workspace-tom-grok/deliverables/hecmedia/release-2026-08-06-playbook-exec/`
(Command log, Gate 2–3 artifacts; **authoritative narrative remains this section after merge**.)

### Attempt: cost-optimization rollout — 2026-08-31

**Status: GATE 0 PENDING.** Yomi requested production deployment in the active operator
session and independently approved queue authorization receipt `95042`; that receipt is now
`approved=true`, `status=done`, with result `Acknowledged by Yomi at 2026-08-31
19:12:05.846373-05`. No production workflow may be dispatched, and no knowledge-base resource may
be created or task-role policy applied, until this exact amendment is merged with the remaining
signoffs below.

**Authority provenance:** this amendment records frozen inputs and gates; it does not assign a
role, grant a capability, or authorize its own exceptions. The commander/dispatcher boundary comes
from the already-merged controls in §2, §6, and Gate 0 of this playbook. The exact two local
Terraform actions and the governed backend/frontend deployments come from the independently
approved queue receipt `95042`, whose approved description names the immutable plan paths, hashes,
release SHAs, confirmations, order, and stop conditions. Any action outside that combined policy
and approval record remains unauthorized.

#### Action envelope

| Field | Frozen value |
| --- | --- |
| Commander | Per already-merged §2 / §6 / Gate 0: `yt-agent-tom-grok` (xAI / Grok), the selected sole production dispatcher/mutator |
| Right hand — OpenAI | Per already-merged §2 / §6 / Gate 0: `yt-agent-tom-gpt` — exact-input/evidence review and GO/NO-GO; non-dispatching |
| Flagged provider | Anthropic is out of panel: `subscription_unavailable_pending_funding`, observed at Gate 0 on 2026-08-31 |
| Authorization receipt | Queue task `95042`: `approvalRequired=true`, `approved=true`, `status=done`; Yomi acknowledgement recorded 2026-09-01 00:12:05 UTC |
| Backend source | `ytadvisors/hectv-wp` `main` `16b20e81744aea79e5806de19a7769c7453b0db5` (includes #80 and #81) |
| Frontend application head | `dac589727b9db8b716a94a5afff04f7c9626686f` (includes #308); dispatch uses the exact post-amendment `master` tip after proving no later application change and repeating MBA Docker verification |
| IAM saved plan | `/Users/ytwguru/.openclaw/workspace-root/deliverables/hecmedia/hec-cost-optimization-2026-08-31/production-rollout-2026-08-31/hectv-task-cloudfront-policy.tfplan`; SHA-256 `67b84f5f7c5b09c28a40b4d5452d62fb51289fa2619e1817828bb82566bf2562` |
| Knowledge-base saved plan | `/Users/ytwguru/.openclaw/workspace-root/deliverables/hecmedia/hec-cost-optimization-2026-08-31/production-rollout-2026-08-31/hec-s3-vectors-kb.tfplan`; SHA-256 `f1c07f804fa534875a98f3f779f64407c2086afc28c00c0e2e6cd747a65ce5a5` |
| Backend confirmation | `DEPLOY HEC BACKEND PRODUCTION` |
| Frontend confirmation | `DEPLOY HEC FRONTEND PRODUCTION` |
| Knowledge-base confirmation | `INGEST HEC S3 VECTORS KNOWLEDGE BASE` |
| DDL | None |

MBA Docker verification passed on every exact change head before merge:

- WordPress invalidation #80 head `37640d29669506d8fd016ae18df5f4c750a76385`: production
  Dockerfile build, PHP/contract checks, and a healthy WordPress + MySQL runtime that observed
  exactly two wildcard invalidations for distribution `E2QXRSF2W55RTS`.
- S3 Vectors knowledge base #81 head `7acf8c2ebeb9bc754f792698acd7cc02cddf45e0`:
  Terraform 1.5.7 init, format, validate, contract tests, and the legacy-OpenSearch negative
  control all passed without AWS credentials.
- Edge optimization #308 head `97d67ae4783e6b6979c0c3c00331028f0134763e`: 84 suites / 515
  tests, ESLint with zero errors, production Next.js build, HTTP cache-header runtime probe, and
  both Lambda package integrity checks passed on MBA arm64.

Evidence root:
`/Users/ytwguru/.openclaw/workspace-root/deliverables/hecmedia/hec-cost-optimization-2026-08-31/`.

#### Frozen recovery baselines

| Surface | Baseline captured 2026-08-31 |
| --- | --- |
| Backend service | `hectv-wp-production`: 2 desired / 2 running / 0 pending; rollout `COMPLETED`; circuit breaker + rollback enabled |
| Backend task definition | `arn:aws:ecs:us-east-2:850335719356:task-definition/hectv-wp-production-rollback-pr34-safe:17` |
| Backend image | `sha256:b3708899e518cfe69c2743280ac36e21b2f7c9218047e0247d0aef20f8ff5269` |
| Backend task-role IAM | `hectv-wp-production-task` has only inline policy `mount-production-uploads`; reviewed policy `invalidate-hecmedia-cloudfront` is absent |
| CloudFront | Distribution `E2QXRSF2W55RTS`; ETag `E1CI41A2FQHFJ`; default TTL 60 seconds; `_next/data/*` TTL 0 |
| Default edge Lambda | `arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd:164`; code SHA `l5sQIU9UGYTiR5t5cZzFxmYRE+ONQzKCCV5y0pGnvgw=`; 3000 MB |
| Newsletter API Lambda | `arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-api:19`; code SHA `FGHSbm6njd+UBZ4+0sthIaJIoQzYHixTBfQ3nKNF9RI=`; 1024 MB |
| Public site | `https://hecmedia.org/` HTTP 200; response advertises `s-maxage=5` before this rollout |

Each workflow must re-read its baseline immediately before dispatch. Any drift from these values,
an active production workflow, a non-tip release SHA, or an unhealthy service is an automatic
NO-GO; update this amendment through a new reviewed commit rather than substituting an input.
Because merging this durable amendment advances frontend `master`, the resulting exact merged
tip must repeat the MBA Docker production test/build gate before frontend dispatch, even though
this amendment changes documentation only.

#### Ordered execution and stop gates

1. Verify the frozen IAM saved-plan path and SHA-256 in the action envelope, then use
   `terraform show -json` to prove it contains only
   `aws_iam_role_policy.task_cloudfront_invalidation`. The preserved plan is exactly
   1 addition, 0 changes, and 0 destroys: inline policy `invalidate-hecmedia-cloudfront` on role
   `hectv-wp-production-task`, allowing only `cloudfront:CreateInvalidation` on distribution
   `E2QXRSF2W55RTS`. Apply only that hashed saved plan; then verify the live role policy
   byte-for-byte. A hash mismatch, state-serial failure, extra action, or attempted regeneration is
   a stop requiring a new reviewed amendment.
2. Deploy backend `16b20e8…` through `hectv-wp/.github/workflows/production-deploy.yml`.
   Wait for Yomi's independent protected-environment approval, workflow success, ECS steady state,
   public WordPress probes, and artifact verification.
3. Prove the production ECS task-role path can submit and complete one CloudFront wildcard
   invalidation with the reviewed `hectv-publish-` caller-reference prefix. Do not alter public
   content merely to generate this proof. A missing task-role permission or failed invalidation is
   a release stop.
4. Only after steps 1–3 pass, deploy frontend `dac5897…` through
   `hecmedia/.github/workflows/production-deploy.yml`, using the exact post-amendment `master` tip
   that preserves `dac5897…` as an ancestor. First repeat the full MBA Docker production gate on
   that exact tip. Then wait for Yomi's separate environment approval and require workflow success,
   CloudFront deployment, 1536 MB default Lambda memory, the five-minute cache contract, fresh
   public probes, and cache-hit evidence.
5. Only after edge verification, provision the additive S3 Vectors knowledge base from backend
   `main` using only the frozen saved-plan path and SHA-256 in the action envelope. Recheck its JSON
   as exactly the seven reviewed additions, 0 changes, and 0 destroys before apply; any hash
   mismatch, state-serial failure, or attempted regeneration is a stop requiring a new amendment.
   Start exactly one ingestion job with receipt `95042`; require `COMPLETE`, zero failed documents,
   non-empty vectors, and all five retrieval-parity queries at or above 0.30 source overlap.
6. Preserve legacy knowledge base `ZKA5J7Y0WL`, its data source, and its OpenSearch Serverless
   collection. This attempt does not authorize a consumer switch or legacy deletion. Those actions
   require consumer discovery plus a separate reviewed rollback/decommission record.

Approved queue receipt `95042` is the independent authorization for the two local Terraform actions
in steps 1 and 5; this amendment does not create that authority. The production workflow role
intentionally cannot modify IAM, while `hectv-wp/infra/production` owns the task role and the merged
invalidation policy. The receipt limits step 1 to the targeted, one-addition saved plan described
above. Separately, the merged service-specific runbook at
`hectv-wp/infra/knowledge-base/README.md` defines a local Terraform apply with profile `hecadmin`;
no knowledge-base GitHub workflow exists. The receipt limits step 5 to the seven-addition saved plan
in account `850335719356`, region `us-east-1`, followed by the repository's guarded ingestion and
parity scripts. Neither the existing playbook nor receipt `95042` grants direct ECS, CloudFront,
Lambda, consumer-switch, deletion, plan-substitution, or plan-regeneration authority.

#### Signoff and receipt log

| UTC | Event | Detail |
| --- | --- | --- |
| 2026-08-31 | User intent | Yomi requested deployment after the three implementation PRs merged |
| 2026-08-31 | Gate 0 inventory | xAI and OpenAI unflagged; Anthropic flagged and out of panel; no active production workflows observed |
| 2026-09-01 00:12:05 | Independent authorization | Queue task `95042`: `approvalRequired=true`, `approved=true`, `status=done`; result records Yomi acknowledgement at 2026-08-31 19:12:05.846373-05 |
| 2026-08-31 | IAM preflight stop | Live task role lacks invalidation policy; frozen saved plan from backend `16b20e8…` is exactly 1 add / 0 change / 0 destroy with SHA-256 `67b84f5f…2562`; apply remains blocked |
| 2026-08-31 | Knowledge-base preflight | Frozen remote-state plan from backend `16b20e8…` is exactly the seven reviewed creates / 0 change / 0 destroy with SHA-256 `f1c07f80…e5a5`; no resources created |
| *pending* | xAI commander GO | `yt-agent-tom-grok` must affirm this exact amendment and frozen inputs |
| *pending* | OpenAI right-hand GO | `yt-agent-tom-gpt` must independently review this exact amendment and MBA evidence |
| 2026-09-01 00:12:05 | Yomi queue approval | Exact deployment and saved-plan scope in queue receipt `95042` approved and acknowledged |
| *pending* | Yomi amendment approval | Approve this exact amendment PR/commit; queue approval does not substitute for PR approval |
| *pending* | IAM receipt | Record saved-plan SHA-256, JSON contract, apply output, and live policy verification |
| *pending* | Backend receipt | Record workflow URL, environment approval, result, new task definition/image, and probes |
| *pending* | Invalidation proof | Record invalidation ID, caller reference, timestamps, and completion status |
| *pending* | Frontend receipt | Record workflow URL, environment approval, result, new Lambda versions/checksums, ETag, and probes |
| *pending* | Knowledge-base receipt | Record plan summary, resource IDs, ingestion ID/stats, and parity artifact |

**GO requires:** exact-head xAI and OpenAI model-family signoff, Yomi approval of task `95042`
and this amendment, exact saved-plan hashes, no baseline drift, and no active production workflow.
Until then the decision is **NO-GO / wait**.

### Signoff block for this process amendment

Reviewers of **this** commit should confirm:

- [ ] Production requires co-signed playbook before dispatch
- [ ] Deployment progress is documented in section 18 via PR, not chat-only
- [ ] Policy: each deployment has one **commander**; the commander's **right hand is a rep from each unflagged provider**
- [ ] Policy: commander + per-unflagged-provider right hand **coordinate the release** on the playbook surface
- [ ] Current receipt `31136386999` remains blocked on right-hand panel GO then Yomi env approval
- [ ] Zombie `31128179764` remains never-approve
