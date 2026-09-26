# HEC Media GTM production deployment playbook — 2026-08-10

## Control status

**Status: NO-GO — plan and review only. No production deployment has been authorized or executed.**

This playbook governs the next HEC Media frontend production release that restores Google Tag
Manager container `GTM-57RZPNN`. Approval of this document authorizes only the recorded read-only
preparation needed for the next gate. Each prerequisite code PR, merge, GitHub setting change,
owner decision, and production dispatch requires its own scoped review and approval. This document
does not authorize a dispatch while any NO-GO item remains open.

The deployment commander must stop if the repository, workflow, live AWS state, or approved scope
differs from this playbook. Never weaken or bypass a verifier to make a release pass.

## Intended outcome

- Deploy an exact reviewed `master` SHA containing merged GTM implementation PR
  [#271](https://github.com/ytadvisors/hecmedia/pull/271).
- Restore exactly `GTM-57RZPNN` in rendered HEC Media pages and prove that it loads once.
- Preserve the currently serving HEC Media site and its rollback path throughout the cutover.
- Keep the HEC TV WordPress/backend stack, database, DNS, IAM, and unrelated AWS resources
  unchanged.
- Produce a green governed workflow, immutable release tag, Actions evidence, and co-signed
  execution record.

## Release scope is larger than PR #271

The current live Lambda description identifies source `76ff06f609dd…`, while the initial planning
anchor on `master` is `81d0a59a60f38be55df353c0b98f59bc375bf4f9`. The governed workflow deploys
the exact `master` tip, so the candidate includes every intervening change, not just GTM:

| PR | Surface | Required release proof |
| --- | --- | --- |
| #268 | Production media URL and thumbnail repair | Media preflight, hydrated media checks, and production verifier pass |
| #269 | Sanitized rollback repin | Published version `150` and its exact checksum remain valid |
| #270 | Frontend staging publisher retirement and edge build refactor | No staging publish path is recreated; production package tests pass |
| #271 | Exact production GTM injection | Only `GTM-57RZPNN` is inlined, rendered, loaded, and observed |

The production workflow also republishes the existing frontend Lambda and newsletter API Lambda,
syncs versioned frontend assets without `--delete`, and updates the existing CloudFront
distribution. The release is therefore a governed full frontend publish with a GTM objective, not
a one-line GTM mutation.

## Hard boundaries

- Use only `.github/workflows/production-deploy.yml` from the exact `master` tip.
- Do not run `yarn deploy`, Serverless Components, direct AWS mutation, or a workstation deploy.
- Do not restore or publish to frontend staging. Staging retirement/decommissioning is a separate
  approved workstream.
- Do not create or delete infrastructure. The governed workflow may update only its existing S3,
  Lambda, and CloudFront resources.
- Do not touch the HEC TV WordPress/ECS backend, any production database (including HEC TV
  Aurora/MySQL), DNS, IAM, launchd, OpenClaw runtime, or stale-resource decommission plan.
- Do not submit newsletter/forms, trigger conversions, or send production outreach during smoke
  testing.
- Do not infer a rollback target as version N-1 or from a release tag.

## Planning baseline — evidence only

Observed independently on 2026-08-10 around 05:03 UTC. These values prove the starting state but
**must be recaptured immediately before dispatch**; stale values are not valid workflow inputs.

| Item | Planning observation |
| --- | --- |
| Repository planning anchor | `81d0a59a60f38be55df353c0b98f59bc375bf4f9` (`master`, merged PR #271) |
| Public site | `https://hecmedia.org/` returns HTTP 200 through CloudFront |
| Public release metadata | `76ff06f609dd…` |
| Public GTM evidence | No `GTM-*`, `googletagmanager.com`, or `dataLayer` reference in raw homepage HTML |
| GTM endpoint | `gtm.js?id=GTM-57RZPNN` returns HTTP 200; resource version `21` currently references `G-7HGHHBRHPT`, `UA-13018774-2`, `AW-866730806`, and `AW-123456789` (all informational and unapproved until owner classification) |
| CloudFront | `E2QXRSF2W55RTS`, status `Deployed`, ETag `E73C1MWIS7SM3` |
| Aliases and origin | `hecmedia.org`, `www.hecmedia.org`; sole origin `x2l4ew-k0m7umi` |
| Live default Lambda@Edge | `arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd:150` |
| Live/rollback checksum | `InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag=` |
| Lambda state | Version `150`, Active, `nodejs24.x`; four owned SSR associations |
| Newsletter API behavior | Absent |
| S3 versioning | Enabled on `x2l4ew-k0m7umi` |
| S3/Lambda residue | `BUILD_ID` reflects failed candidate `0bb1055…`; unassociated default Lambda `:151` and API `:6` remain as evidence and must not be cleaned during this release |
| Sanitized rollback | The same immutable default Lambda version `150` and checksum above |
| HEC TV production backend | ECS service Active, desired/running/pending `4/4/0`, rollout Complete, task definition `hectv-wp-production-rollback-pr34-safe:6`, image digest `sha256:577e1d82c122de059dc0799ba17b5c1b50f98db60ef64783f15ddb37c9e92460` |
| HEC TV public checks | `prod-wp.hectv.org` root HTTP 200; read-only GraphQL title `HEC Media` with no errors |
| Decommission interlock | Reversible quiescence is complete, but its 24-hour observation remains active until at least `2026-08-11T04:36:29Z`; destructive cleanup remains NO-GO |
| AWS budget | August unblended estimate through 2026-08-10 exclusive: `$624.5423053676`, below the `$1,000` escalation threshold; recapture before release |

## Current NO-GO blockers

All blockers require evidence in the execution record before the release may move to GO.

### B1 — production verifier deterministically rejects a valid live route

The most recent cutover, Actions run `31209936363`, reached production and then failed because
`scripts/verify-production.js` required literal `HEC-TV` on `/posts/hec-on-youtube`. The script
automatically restored version `150`. The current live page is HTTP 200, has a valid `HEC on
YouTube` title and release metadata, but correctly does not contain that literal. Current `master`
retains the same assertion, so dispatching it would predictably cut over and roll back again.

Both `scripts/verify-production.js` and the hydrated browser verifier in
`scripts/production-deploy.js` apply the stale universal identity check. Before release, merge a
reviewed verifier fix that:

- keeps HTTP 200, exact release-SHA metadata, the B5-selected forms/newsletter metadata contract,
  and valid title checks on every required route;
- applies route-specific identity/content assertions instead of requiring homepage copy on every
  page;
- retains hydrated navigation/media checks;
- adds regression coverage for `/posts/hec-on-youtube`; and
- passes against both the exact candidate and the current live rollback baseline where applicable.

### B2 — successful deploy cannot complete its immutable tag step

Actions run `31164307627` applied and verified a candidate, then failed because the annotated-tag
step had no Git committer identity. Current `master` still calls `git tag -a` without setting a
deterministic bot identity.

Before release, merge a reviewed workflow fix that configures the approved bot identity for the
tag operation (or an equivalently reviewed immutable-tag mechanism), includes regression coverage,
and proves that `hecmedia-production-<12-character-sha>` is created only after successful public
verification.

### B3 — the workflow does not yet prove GTM safely

PR #271 correctly pins the build environment and rejects missing or wrong container IDs, but the
current production verifier does not assert the rendered GTM result. Its existing hydrated Chrome
smoke also has no request interception; enabling GTM would let that automated smoke generate
analytics, ads, popup, and social-pixel traffic on five production routes. Before release, the reviewed
prerequisite change must add:

- a pre-credential package/SSR assertion that the built candidate contains exactly
  `GTM-57RZPNN`, contains no other `GTM-*` ID, and contains no `undefined` container;
- a post-cutover raw-HTML assertion for the same exact container on the homepage and at least one
  representative SEO/content route; and
- governed browser request interception that permits and records only the exact GTM loader plus
  approved first-party/media origins, deny-by-default blocks and records all other GTM-caused
  third-party egress, and asserts a single `dataLayer` bootstrap;
  and
- focused tests that fail for a missing, duplicate, wrong, or analytics-polluting implementation.

### B4 — branch-protection detail is not independently proven

The production environment is correctly restricted to `master`, requires owner review, prevents
self-review, and does not permit administrator bypass. The repository branch API reports
`master` as `protected=true` with protection enabled, but reports required status-check enforcement
as `off`. No repository ruleset is applied, and the current publisher token cannot read the
detailed classic-protection settings.

Before dispatch, an authorized administrator must capture a sanitized read-only snapshot of the
existing classic protection and compare it with `DEPLOY.md` and the approved release policy. Change
only a proven gap through a separately scoped settings approval, then verify the effective rule.
Do not blindly replace an unreadable rule. Until the effective control is proven, the release
remains NO-GO.

### B5 — current deploy would reactivate a dormant newsletter API

Current production has no newsletter API CloudFront behavior, while the governed deploy always
publishes `x2l4ew-api`, adds `api/newsletter/subscribe`, and verifies send-enabled forms. The
separate stale-resource decommission inventory classifies that unassociated function and its
versions as dormant. Silently reintroducing it would invalidate the decommission premise and cross
the approved workstream boundary.

Before release, Yomi must choose one of two reviewed paths:

1. retain/reactivate the newsletter API and send-enabled forms, explicitly remove it from the
   decommission target set, and require its full functional/security acceptance; or
2. merge a reviewed GTM release-path correction that does not publish or associate the newsletter
   API and updates the frontend/forms verifier contract consistently.

Record the decision and matching PR/evidence in the execution record. Ambiguity is NO-GO.

### B6 — repository CI is disabled

The repository `CI` workflow has been manually disabled since 2026-07-27, so merged PR #271 has no
independent GitHub CI result. Author-reported focused tests and review are useful evidence but do
not certify the release candidate.

Re-enable the reviewed CI workflow before merging prerequisite production fixes, or establish an
equivalent independently executed exact-head check suite approved by the team. The final frozen
SHA must have recorded lint, unit, coverage, e2e, package, verifier, and GTM evidence before the
production environment is approved.

### B7 — decommission observation and production deployment cannot overlap

The HEC decommission work has quiesced staging and legacy capacity, but its mandatory 24-hour
observation is still active. A frontend production cutover during that window would confound its
health evidence, while later destructive cleanup could invalidate this release baseline.

Before release:

- let the observation close successfully, or obtain a separately reviewed/Yomi-approved plan to
  restart the full observation after this release;
- freeze all decommission executors, Terraform/CloudFormation changes, DNS changes, and destructive
  cleanup for the complete deployment/rollback window;
- capture production DNS, ALB targets, ECS `4/4/0`, task definition and image digest, Aurora/MySQL,
  EFS, WordPress root/admin/REST/GraphQL, and representative media health before cutover; and
- prove those surfaces are byte-for-byte/configuration-equivalent or health-equivalent after
  deployment and rollback.

Any unexplained production-backend or decommission-state drift is NO-GO.

### B8 — current automatic rollback does not restore S3

The deploy uploads assets with `aws s3 sync` before CloudFront cutover. The automatic rollback
restores Lambda/CloudFront only; it does not restore overwritten S3 objects. The currently mixed
`BUILD_ID`/live-Lambda state demonstrates why a green Lambda reassociation alone is not complete
rollback proof.

The current OIDC role can `ListBucket`, `GetObject`, and `PutObject`, but cannot
`ListBucketVersions` or `GetObjectVersion`; direct noncurrent-VersionId recovery is therefore not
executable and is not an approved fallback. Before release, merge a tested governed-workflow
control that stays within the current role by:

- producing the exact candidate upload-key manifest before mutation;
- server-side copying each current colliding/mutable object to a task-scoped preimage/evidence
  prefix before sync;
- recording the source VersionId as evidence plus the preimage key, ETag/checksum, size,
  Content-Type, Cache-Control, Content-Encoding, and custom metadata;
- classifying every candidate key as exactly one of: an existing collision with verified preimage,
  a content-addressed additive key, or a separately owner-approved additive exception; any new
  mutable/unapproved key is NO-GO because the role has no `DeleteObject` recovery;
- restoring each preimage's bytes and metadata to its original key with ordinary
  `GetObject`/`PutObject`, thereby creating and checksum-verifying a new current version; and
- leaving unrelated and evidence objects untouched.

Bind every preimage set immutably to the exact deploy `request_task_id`, GitHub run ID, release SHA,
pre-cutover baseline, manifest S3 key, and manifest SHA-256. The automatic failure path must use the
in-memory/bound manifest from that same run. A manual rollback must provide and verify the original
deploy task ID, deploy run ID, manifest key, and manifest checksum through reviewed rollback-only
workflow inputs. Never infer a manifest from “latest,” release SHA alone, or the rollback task ID.

Exercise the recovery logic against a non-production fixture/versioned bucket or deterministic
mock. No workstation/manual restoration is permitted. Any alternative that reads noncurrent S3
versions requires a separately approved least-privilege IAM change and reviewed workflow support
before the final freeze; it cannot be improvised during rollback.

Both automatic and manual rollback must use the same ordered recovery path: restore/reassociate the
sanitized Lambda/CloudFront state, restore all mutable S3 preimages, then issue and await the final
`/*` invalidation. Run normal-key and cache-busted public recovery checks only after that final
invalidation. If an implementation invalidates earlier, it must issue and await a second final
invalidation after the S3 restore.

After the first candidate S3 write, any later failure—including one before CloudFront cutover—must
invoke preimage recovery. Restore Lambda/CloudFront only if those surfaces changed, but always
restore S3 when a candidate write may have occurred.

### B9 — the GTM container is mutable and not yet owner-approved

The public loader is mutable independently of this repository. Planning reads observed resource
version `21` and multiple GA/legacy/Optimize/Ads destinations, including `UA-13018774-2`,
`GTM-KXDQM43`, `G-7HGHHBRHPT`, `AW-123456789`, `AW-866730806`, `795405937`, and `866730806`, that
require an analytics-owner classification before the loader may reach production.
The same planning payload includes Vimeo tracking custom HTML, a Mailchimp popup loader, and
Facebook Pixel `420290078314527` with PageView behavior; GA/Ads-only filtering is therefore
insufficient.

Before environment approval, a named analytics owner must export/identify the exact published GTM
container version, approve the complete active tag/trigger/destination inventory, consent/PII
behavior, and every legacy ID,
and explicitly classify or remove placeholder/test destinations. Capture the fixed-client public
response's `Last-Modified`, SHA-256, and tag destinations as secondary evidence, then freeze GTM
publishing through the deployment/soak window. Any container/version/destination drift restarts
review.

### B10 — there is no like-for-like staging candidate

Frontend staging publishing is retired and its decommissioned/quiesced surface is not candidate
evidence. Before production, run the packaged Lambda/local SSR candidate against the read-only
production CMS with all writes disabled. Prove the representative route, media, GTM, forms-mode,
and release-SHA contracts from the exact package. Also add repeated cache-busted fresh-origin
checks across both production hostnames to the reviewed verifier so success cannot be satisfied by
one stale cached response.

If a faithful local packaged-Lambda/SSR smoke cannot be produced, record an explicit owner risk
acceptance, select a low-traffic window, and have the exact rollback/S3 recovery already reviewed
and ready. The provider panel may still return NO-GO.

### B11 — execution authority and fresh state do not exist yet

No positive queue-task receipt, final co-signed execution record, final release SHA, or fresh AWS
input snapshot exists for the deployment attempt. Create them only after B1–B10 are cleared and the
new `master` tip has been reviewed.

## Roles and separation of duties

| Role | Responsibility |
| --- | --- |
| Yomi / production owner | Approves this playbook, prerequisite PRs, and the protected `production` environment |
| Deployment commander (`yt-agent-tom-gpt` unless reassigned) | Owns one attempt, records commands and timestamps, dispatches the workflow, and invokes rollback when required |
| Provider review panel | One named right-hand representative from every unflagged provider family; independently re-reads the exact SHA, AWS inputs, workflow state, GTM evidence, backend/decommission interlock, and stop/rollback decision |
| Grok right-hand verifier | Required panel seat for xAI when unflagged; coordinates the independent GTM, baseline, and rollback read-back without sharing the commander's assumptions |

The dispatcher cannot approve their own protected-environment job. Only the commander dispatches
or invokes rollback. At Gate 0, record each provider's health/flag state and named eligible seat.
The exact playbook/amendment and every production receipt require Yomi plus at least two independent
model-family approvals, including every unflagged provider seat required by the canonical release
policy. A missing required seat, silence, or dissent is NO-GO; resolve it by revising and
re-reviewing, not by bypass.

## Phase 1 — approve and remediate

1. Obtain the required exact-head provider-panel approvals, then Yomi approval of this playbook PR
   as a plan, not as a production dispatch.
2. Clear B1–B10 through narrowly scoped reviewed changes, configuration evidence, and the explicit
   newsletter API owner decision.
3. Require independent cross-family review, all focused tests, and the repository's full checks on
   the exact prerequisite heads.
4. Merge only approved, green fixes to `master`.
5. Do not combine stale-resource decommissioning or backend changes with these fixes.
6. Re-run the full eligible provider-panel review against the resulting exact `master` tip. Any new material commit
   returns the release to NO-GO until reviewed.

## Phase 2 — freeze the release candidate

The planning anchor `81d0a59…` cannot be the final release SHA after this playbook and the
prerequisite fixes merge. At execution time:

1. Fetch `origin/master` without tags and record its exact 40-character SHA as `release_sha`.
2. Prove `81d0a59a60f38be55df353c0b98f59bc375bf4f9` is an ancestor of that SHA.
3. Record every commit and PR between live source `76ff06f609dd…` and the final SHA.
4. Confirm there are no unreviewed code, workflow, dependency, infrastructure, or backend changes.
5. Freeze merges until the production attempt reaches a terminal verified state.
6. Every required provider-panel representative independently compares the recorded SHA to the
   GitHub `master` tip and co-signs it.

If the tip changes after capture, discard all captured inputs and restart this phase.

## Phase 3 — exact-candidate checks before AWS credentials

Run from a clean worktree at the final remote SHA using the same Node version and frozen lockfile
as the workflow. Record full output or links.

- [ ] `yarn install --frozen-lockfile`
- [ ] `yarn lint`
- [ ] `yarn test`
- [ ] Read-only production media e2e preflight passes with `E2E_ALLOW_WRITES=0`
- [ ] Full read-only production content e2e suite passes with `E2E_ALLOW_WRITES=0`
- [ ] Corrected route-specific verifier regression passes
- [ ] Release-tag identity regression passes
- [ ] GTM contract tests reject blank, wrong, duplicate, and `undefined` values
- [ ] Governed hydrated verifier permits the exact GTM loader and approved first-party/media
  origins while deny-by-default blocking and recording every other GTM-caused third-party request
- [ ] Production package builds through `scripts/production-deploy.js build`
- [ ] Packaged-Lambda/local SSR smoke against the read-only production CMS passes with writes
  disabled
- [ ] Built package/SSR artifact contains exactly `GTM-57RZPNN` and no other GTM ID
- [ ] Cache-busting and exact-SHA verifier behavior passes against the local packaged candidate or
  deterministic fixtures; production hostnames are not expected to serve the candidate yet
- [ ] Uncompressed package contains no AWS access-key material
- [ ] Prior failure route `/posts/hec-on-youtube` satisfies its corrected contract

The governed workflow reruns its own installation, lint, unit, e2e, packaging, secret scan, and
media checks. Local evidence cannot substitute for those workflow gates.

## Phase 4 — fresh production baseline and rollback proof

Capture these read-only facts immediately before authorization using AWS profile `hecmedia`, and
prove the caller account is exactly `850335719356`:

- current-month unblended AWS cost against the `$1,250` cap; if it is at or above `$1,000`, stop
  and obtain explicit Yomi cost approval before any AWS-changing step;
- CloudFront `E2QXRSF2W55RTS` status, ETag, aliases, sole S3 origin, every cache behavior, and all
  Lambda@Edge associations;
- exact current default Lambda version ARN and its `CodeSha256`;
- exact current newsletter API version ARN, or the literal `none` if its behavior is absent;
- `$LATEST` function contracts for both existing Lambda functions;
- S3 versioning state and current `BUILD_ID` version;
- unassociated failed-candidate Lambda versions and the mixed S3/live-Lambda state, without deleting
  or normalizing either;
- exact candidate upload-key manifest and current-IAM preimage-copy map/checksums/HTTP metadata for
  every existing colliding/mutable key, plus the tested restore receipt;
- sanitized rollback version `150` state and exact pinned checksum;
- current public release-SHA metadata and repeated cache-busted raw GTM/route/media responses from
  both production hostnames, which must still identify the captured current-live SHA before
  cutover;
- analytics-owner export/approval of the exact GTM published version and complete tag inventory,
  fixed-client loader headers/hash, and proof that container publishing is frozen;
- HEC TV production DNS, ALB target health, ECS task definition/image and `4/4/0` state,
  Aurora/MySQL, EFS, WordPress root/admin/REST/GraphQL, and representative media health;
- decommission observation status and proof that every decommission/destructive executor is
  frozen for the release window; and
- absence of any active or queued HEC Media production deployment run.

Stop on any unexpected alias, origin, association, resource name, non-`Deployed` distribution,
disabled versioning, checksum mismatch, GTM inventory drift, incomplete S3 recovery evidence,
backend/decommission drift, concurrent run, or changed ETag. Do not repair drift inside the
deployment attempt.

Create a new positive HEC Media queue-task receipt for this exact attempt. The receipt, SHA, inputs,
Yomi approval, and all required provider-panel co-signs must refer to the same candidate.

## Phase 5 — governed dispatch and approval

Dispatch `.github/workflows/production-deploy.yml` from `master` with:

| Input | Required value |
| --- | --- |
| `action` | `deploy` |
| `release_sha` | Final frozen 40-character `master` SHA |
| `expected_cloudfront_etag` | Fresh ETag from Phase 4 |
| `expected_default_lambda_version_arn` | Fresh live version ARN from Phase 4 |
| `expected_default_lambda_code_sha256` | Exact checksum for that live version |
| `expected_api_lambda_version_arn` | Fresh live API ARN or `none` |
| `request_task_id` | Positive receipt for this exact attempt |
| `confirmation` | `DEPLOY HEC FRONTEND PRODUCTION` |

Then:

1. Record the run URL and immutable run ID immediately.
2. Require `authorize` and the no-credential `media-preflight` job to pass.
3. Before environment approval, every required provider-panel representative independently
   verifies the run's SHA, captured inputs, effective branch protection, candidate checks, GTM
   export/freeze, backend/decommission interlock, S3 recovery, rollback checksum, and lack of
   concurrent runs.
4. Each required representative records GO or NO-GO with evidence; silence is NO-GO.
5. Yomi approves the protected `production` environment only after the complete panel GO.
6. Before `s3 sync`, require the workflow to create and checksum the immutable preimage manifest
   bound to this deploy task/run/SHA/baseline and record the manifest key/hash in evidence.
7. Monitor every workflow phase. Do not dispatch a replacement while the current run is active.

## Phase 6 — cutover acceptance

The workflow must finish green through public verification, evidence upload, and immutable release
tagging. A failed run that automatically restores production is a successful safety response, not
a successful release.

### Public application checks

- [ ] Corrected `scripts/verify-production.js` passes every route, exact release SHA, the B5-selected
  forms/newsletter contract, and hydrated content/media check.
- [ ] Homepage plus representative content/category/event/newsletter routes return HTTP 200.
- [ ] `/posts/hec-on-youtube` passes its reviewed route-specific contract.
- [ ] No route shows `undefined`, broken media, SSR errors, or navigation regression.
- [ ] Repeated cache-busted fresh-origin checks on both production hostnames and hydrated-browser
  checks agree with the expected candidate.

### GTM checks

- [ ] Raw homepage and representative SEO/content HTML contain exactly `GTM-57RZPNN`.
- [ ] No raw page or built asset contains another `GTM-*` container or an `undefined` ID.
- [ ] Browser network loads
  `https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN` successfully once.
- [ ] `window.dataLayer` exists and contains the initial `gtm.js` event once.
- [ ] No GTM-related CSP or JavaScript console error occurs.
- [ ] The post-cutover GTM resource version, complete tag/destination inventory, loader headers,
  and fixed-client hash match the pre-approved frozen evidence.

The governed browser verifier must deny by default and record all GTM-caused third-party egress
while allowing the exact GTM loader and approved first-party/media origins; an operator-only browser
setting is not sufficient because the production workflow itself launches Chrome. Do not use a
manufactured GA Realtime visit as deployment proof, submit forms, or trigger conversions. The
analytics owner may passively confirm that normal post-release traffic reaches the approved
property after technical acceptance.

### AWS and release checks

- [ ] CloudFront returns to `Deployed` and all owned associations point to the newly published
  reviewed versions.
- [ ] If B5 selected retain/reactivate: the exact newsletter API association exists and the GET
  405, invalid POST 400, origin/method, input-validation, no-secret, and no-unapproved-send security
  contracts pass.
- [ ] If B5 selected omit: no newsletter API version is published or associated, the behavior
  remains absent, and the reviewed forms-disabled/frontend verifier contract passes.
- [ ] S3 versioning remains enabled; the upload manifest matches expectation; collision versions
  remain recoverable; and no unrelated object/resource was deleted.
- [ ] HEC TV production DNS, ALB target health, ECS `4/4/0`, task definition/image, database, EFS,
  WordPress/REST/GraphQL, admin, and media evidence is unchanged.
- [ ] The decommission observation/executor freeze remains intact and no decommission mutation
  occurred during the release.
- [ ] `hecmedia-production-<release_sha[0:12]>` exists and resolves to the exact release SHA.
- [ ] Actions evidence includes before/after CloudFront state, build metadata, verification output,
  invalidation ID, and final outcome.
- [ ] A ten-minute soak produces no stop signal.

## Stop and rollback conditions

Stop before cutover, or invoke the governed rollback after cutover, for any of the following:

- target SHA or `master` tip drift;
- branch protection, environment approval, queue receipt, or reviewer mismatch;
- disabled/unproven exact-head CI or a team NO-GO verdict;
- stale/mismatched CloudFront ETag, Lambda ARN, checksum, API behavior, or rollback checksum;
- unapproved GTM version/tag drift, incomplete/unbound S3 collision manifest, or unready object
  recovery;
- any lint, unit, e2e, package, media, verifier, or tag test failure;
- missing, wrong, duplicate, or `undefined` GTM ID;
- GTM script/CSP failure or unintended analytics destination;
- unblocked GTM-caused third-party egress or an unresolved newsletter API ownership decision;
- HTTP 4xx/5xx, invalid release metadata, broken media/navigation/forms, or SSR error;
- unexpected AWS resource creation/deletion, any backend health/config drift, or any
  decommission mutation;
- inability to independently prove current or rollback state; or
- a missing provider-panel seat or disagreement among the commander and required panel. Dissent is
  NO-GO until revised and re-reviewed.

The deploy script is expected to restore the pinned sanitized Lambda/CloudFront version
automatically when its post-cutover verification throws. It does **not** restore S3 object
versions. Whether automatic or manual, independently verify the rollback and run the pre-reviewed
S3 collision recovery when required; never assume recovery completed because the workflow stopped.

## Governed rollback

Use the same workflow from the exact current `master` tip with:

- `action=rollback`;
- a new positive rollback task receipt;
- explicit rollback-only inputs for the original deploy task ID, deploy run ID, exact preimage
  manifest S3 key, and manifest SHA-256;
- fresh audit inputs from the live distribution; and
- confirmation `ROLLBACK HEC FRONTEND PRODUCTION`.

The rollback-only inputs must be added and fail-closed by the reviewed B8 prerequisite change.
They must resolve to the exact original deploy baseline before any S3 copy or CloudFront update.

The reviewed rollback target is only:

- `arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd:150`
- `CodeSha256=InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag=`

The rollback must place all four owned SSR associations on version `150`, remove the newsletter API
behavior, and copy each exact-manifest preimage's bytes and metadata back to its original mutable S3
key with the governed role, creating a new current version. Verify every checksum/metadata record,
leave additive content-addressed/evidence objects intact, then issue and await the final `/*`
invalidation. Only after that invalidation, verify normal-key and cache-busted public recovery.
Confirm that the pre-release public release SHA and GTM-absent behavior are restored and that the
complete HEC TV backend/decommission baseline remains unchanged. Preserve failed candidate
versions and logs as evidence; do not delete them during incident response.

## Evidence and living execution record

The in-repository
[GTM production deployment log](gtm-production-deployment-log-2026-08-10.md) is the canonical,
co-signed attempt index. Before the final SHA freeze, create a dedicated execution-log branch and
draft PR, then record the final input snapshot, provider panel, and GO/NO-GO receipts there. During
the immutable production window, append and push timestamped entries to that branch without
merging it to `master`. After the attempt reaches a verified terminal state, complete the outcome,
obtain the required panel reviews, and merge the closeout log PR. The log PR must never move the
release SHA during an active attempt.

Before any dispatch, create and verify an on-disk attempt directory:

`~/.openclaw/workspace-<commander>/deliverables/hecmedia/gtm-production-2026-08-10/<attempt-id>/`

The living log must replace that template with the fully expanded absolute path (for example,
`/Users/ytwguru/.openclaw/workspace-tom-gpt/deliverables/hecmedia/gtm-production-2026-08-10/<attempt-id>/`)
and record the `ls -la` proof before authorization.

Store at minimum:

- approved playbook and prerequisite PR URLs;
- final commit graph and exact SHA;
- branch/ruleset and production-environment API snapshots;
- fresh AWS before/after/rollback JSON and checksums;
- original deploy task/run ID and the exact preimage manifest S3 key/SHA-256 binding;
- local and Actions test/build/verifier outputs;
- queue-task receipts, run URL/ID, environment approval, and release tag proof;
- raw HTML and browser GTM/network/console evidence with analytics collection controls noted;
- commander and complete provider-panel GO, stop, rollback, and final acceptance timestamps; and
- final outcome: `deployed`, `rolled_back`, or `no_go`.

Verify the directory with `ls -la` before claiming the attempt complete. The directory, GitHub
Actions artifacts, and release tag supplement the in-repository log; none replaces the others.

## Approval record

| Gate | Required record | Status |
| --- | --- | --- |
| Playbook review | Named eligible panel, at least two independent model-family approvals, then Yomi approval | Pending |
| B1–B10 remediation/decision | Separately approved PR URL(s), CI/config/S3/GTM/backend evidence, newsletter decision, merged SHA(s) | Pending |
| Final candidate | Exact SHA and complete live→candidate inventory | Pending |
| Preflight | Tests/build/media/GTM artifact proof | Pending |
| Fresh baseline | AWS/GitHub snapshots and rollback proof | Pending |
| Independent GO | Every required provider-panel seat signed the exact receipt | Pending |
| Environment approval | Yomi approval on the exact workflow run | Pending |
| Final acceptance | Green run, tag, GTM proof, soak, co-sign | Pending |

No `Pending` row may be treated as implicit approval.
