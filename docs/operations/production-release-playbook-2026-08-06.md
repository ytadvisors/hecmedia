# HEC Media same-day production release playbook

**Status:** Draft for review; this document does not authorize a deployment

**Prepared:** 2026-08-06

**Decision owner:** Yomi Toba

**Execution policy:** Model-neutral, single commander

**Selected commander for this trial:** Grok lane (`yt-agent-tom-grok`)

**Systems:** `ytadvisors/hecmedia`, `ytadvisors/hectv-wp`, AWS account `850335719356`

## 1. Objective

Release the reviewed HEC Media frontend and WordPress backend today without repeating the
2026-08-06 schema-ordering incident or promoting the corrupted staging image. The release must
remain reversible at each boundary, and every go/no-go decision must be based on real WordPress,
GraphQL, REST, SSR, and browser checks—not the static container health file alone.

The target is a same-day release, not a bypass of failed gates. If a stop condition is reached,
the deployment stops at the last verified compatible pair.

## 2. Non-negotiable controls

1. Execution is model-neutral. At Gate 0, Yomi names exactly one approved model lane as production
   deployment commander for the attempt. For this trial that lane is Grok (`yt-agent-tom-grok`).
   Other model lanes may prepare or review evidence, but they do not dispatch or mutate production.
2. Yomi provides the final go/no-go and the independent protected-environment approval.
3. Production changes run only through the governed GitHub workflows. No workstation production
   deploy, direct CloudFront cutover, or direct ECS release is part of this playbook.
4. Every release input is immutable: exact merged SHA, image digest, CloudFront ETag, versioned
   Lambda ARN, Lambda checksum, current ECS task definition, and current image digest.
5. The backend release is expand/contract. It must preserve the schema used by the currently
   deployed frontend while exposing the new schema. Legacy fields are not removed today.
6. Staging must exercise the same GraphQL compatibility profile as production. Environment-only
   staging resolvers may not make an otherwise incompatible backend appear safe.
7. Image integrity is verified independently of Docker/ECR success. The known-bad digest
   `sha256:beba7812ee56969a4646d09c5afb01ccef4d525e8e5968e2307b140fab664a83`
   is quarantined and must never be promoted.
8. Static `/healthz` proves only that the container and Apache are reachable. It is not an
   application release gate.
9. No database DDL change is included in this release. The required additive GraphQL API-contract
   expansion remains in scope. If database DDL becomes necessary, stop and follow the replicated-PG
   subscriber-first invariant in a separate reviewed plan.

## 3. Verified recovery baseline

This is the state to preserve until the release reaches its next explicit gate.

| Surface | Verified state at 2026-08-06 17:46 CT |
| --- | --- |
| Public site | `https://hecmedia.org` returns HTTP 200 with title `HEC-TV \| Home` |
| Production frontend | CloudFront `E2QXRSF2W55RTS`; ETag `E2YN27AV1NE3XR`; Lambda@Edge `x2l4ew-l5vb7pd:146`; code SHA `5CzpPZ0xXqsNoDJ+Nr8mzRuY9kUKNkIKF6bovFjKsS4=` |
| Newsletter edge behavior | Absent (`none`) |
| Production frontend rollback | Immutable sanitized Lambda version `147`, verified by the governed workflow before cutover |
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
| B5 | Current production frontend artifact has no trustworthy source-SHA metadata | Record Lambda version `146` and checksum as the live/pre-cutover identity; verify sanitized version `147` and its pinned checksum as the sole rollback target; require source SHA metadata in the candidate |
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
3. **Deploy candidate frontend second**.
4. Soak; remove legacy fields only later.

This is still expand/contract. It is **not** a blank backend-first for incompatible modern-only backends without dual-schema proof.

## 6. Roles and communications

| Role | Responsibility |
| --- | --- |
| Yomi | Approves this plan, selects go/no-go, and approves the protected production environments |
| Named deployment commander | Owns the command log, snapshots baselines, dispatches workflows, monitors rollouts, and invokes rollback; Grok (`yt-agent-tom-grok`) holds this role for the current trial |
| Backend change author | Implements the production-safe dual-schema layer and application-readiness check through branch → PR → merge |
| Frontend change author | Ensures candidate operations tolerate both backend contracts and preserves no-write test behavior |
| Independent reviewers | Review code, plan, immutable inputs, test evidence, and stop-condition decisions; no production mutation |
| Incident scribe | Records timestamps, workflow URLs, SHAs, digests, task definitions, Lambda versions, invalidations, probe results, and decisions |

One named commander calls each step. Parallel operators must not dispatch independent workflows or
make overlapping AWS changes. A co-signed playbook authorizes any otherwise-approved model lane to
execute only inside its exact action envelope; it does not grant credentials or permit deviations.

### Executor-neutral hypothesis trial

**Hypothesis:** once this deterministic playbook is co-signed, safe execution depends on the gates,
immutable inputs, governed credentials, and stop conditions—not on the commander's model family.

The playbook is co-signed when Yomi approves it and at least two independent model families record
approval of the same commit, including at least one family other than the selected executor's. A
review of an earlier commit does not count. Co-signing authorizes execution only after every P0 and
Gate 0–3 condition is evidenced.

This Grok-led trial succeeds when:

- Grok is the only lane that dispatches or mutates staging/production for the attempt;
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

**Gate 0:** Yomi approves the exact co-signed playbook commit and names one approved deployment
commander. For this trial the named commander is Grok (`yt-agent-tom-grok`).

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
     `/newsletter/thank-you`, `/category/films`, and `/category/arts/two_on_the_aisle`;
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
frontend rollback target is sanitized version `147` with its pinned checksum; rollback uses `147`
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
- sanitized rollback version `147` checksum verification
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
2. Confirm authorization and all no-AWS-credentials tests pass before approving the protected
   environment.
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
3. Verify pinned sanitized Lambda version `147`, CloudFront deployment, completed invalidation,
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

- approved playbook and review URL
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
- [ ] Is one approved deployment commander named, and are all other lanes confirmed read-only?
- [ ] Do Yomi and at least two independent model families approve this exact commit, including one
      family other than the selected commander's?
- [ ] Is the queue-task receipt valid for this exact attempt?
- [ ] Go / no-go decision recorded by Yomi?
