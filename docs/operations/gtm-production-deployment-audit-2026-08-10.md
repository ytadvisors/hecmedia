# HEC Media GTM production deployment audit — 2026-08-10

## Status and purpose

**Status: implementation in review; production remains NO-GO.**

This record preserves the investigation, decisions, evidence contract, and repeatable procedure for
restoring `GTM-57RZPNN` to `hecmedia.org`. It supplements the
[deployment playbook](gtm-production-deployment-playbook-2026-08-10.md) and
[living execution log](gtm-production-deployment-log-2026-08-10.md). It does not authorize a
production dispatch.

The objective is to avoid redoing the forensic work that preceded the release. Future operators
must re-capture values that are explicitly marked mutable, but should not re-litigate the controls
below unless the implementation or production architecture changes.

## Why the site was not deployed during planning

The GTM change from PR #271 was merged, but a governed production release would have failed or
silently widened scope for several independent reasons:

1. The plain and hydrated verifiers required literal `HEC-TV` on every route. The legitimate
   `/posts/hec-on-youtube` page has title `HEC on YouTube` and no such literal. Production run
   `31209936363` cut over, failed that assertion, and automatically returned CloudFront to the
   sanitized Lambda version.
2. The release-tag step created an annotated tag without configuring a committer identity. Earlier
   run `31164307627` reached a verified cutover and then failed at tag creation with an empty Git
   identity.
3. The old workflow always published and associated the newsletter edge API even though current
   production has no newsletter API behavior and the unassociated function is part of the dormant
   resource inventory.
4. The old automatic rollback restored Lambda/CloudFront but not mutable S3 objects already
   overwritten by `aws s3 sync`.
5. The hydrated browser smoke allowed all GTM-triggered traffic. Enabling the current container
   would have emitted analytics, advertising, Facebook, Mailchimp, and other third-party requests
   during automated verification.
6. The public GTM container is mutable independently of this repository. A container ID alone is
   not an immutable release input.
7. Frontend staging publishing is retired, and the separately governed staging decommission was
   still in its mandatory observation window. A production cutover during that window would have
   destroyed causal clarity.

Planning was therefore real release work: it exposed deterministic failure modes before another
production mutation. The repairs must land branch → PR → independent review → merge before the
workflow can be dispatched.

## Preserved production baseline

The following values were read-only observations and rollback anchors at the start of this audit.
Mutable values must be re-captured immediately before authorization.

| Surface                  | Preserved baseline                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Public release           | `76ff06f609ddf55ccb1f85379ceac89848bc7223`; no GTM loader in raw HTML                                                                  |
| CloudFront               | Distribution `E2QXRSF2W55RTS`, deployed, aliases `hecmedia.org` and `www.hecmedia.org`                                                 |
| CloudFront planning ETag | `E73C1MWIS7SM3` — mutable; re-capture before dispatch                                                                                  |
| Frontend Lambda          | All four owned SSR associations on `x2l4ew-l5vb7pd:150`                                                                                |
| Rollback checksum        | `InGBmR1WRmFN+iojEtw/HdYER96Dlge410JFw3THEag=`                                                                                         |
| Newsletter API           | CloudFront behavior absent; release path selected to keep it absent                                                                    |
| S3                       | Bucket `x2l4ew-k0m7umi`; versioning enabled; mixed failed-candidate `BUILD_ID` residue preserved                                       |
| HEC TV backend           | ECS `hectv-wp-production` healthy at 4/4 tasks on task definition `hectv-wp-production-rollback-pr34-safe:6`; four healthy ALB targets |
| Backend image            | `sha256:577e1d82c122de059dc0799ba17b5c1b50f98db60ef64783f15ddb37c9e92460`                                                              |

The release must not change the HEC TV ECS service, WordPress, Aurora/MySQL, EFS, ALB, DNS, IAM,
OpenClaw services, or stale-resource decommission targets.

## GTM semantic freeze

### Stable gate

The verifier performs a non-executing HTTPS GET of
`https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN`, extracts exactly one top-level
`var data` object, parses `data.resource`, recursively sorts object keys while preserving array
order, and encodes JSON scalars normally. This is `canonical-resource-v1`.

The current audited public resource is:

| Field                                 | Value                                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Resource version                      | `21`                                                               |
| Canonical bytes                       | `19,588`                                                           |
| Canonical SHA-256                     | `c3ab2446ed4ff8b9f4c0c8264b537d0c63fa4a209af365dde8270b205e172c0c` |
| Macro / tag / predicate / rule counts | `22 / 34 / 31 / 18`                                                |
| Normalized inventory schema           | `gtm-normalized-inventory-v1`                                      |
| Normalized inventory SHA-256          | `dac02aa2664beebf11ff639df635a63f2fc739a5db57153da931c6b2dce301e0` |

The resource version, canonical SHA-256, counts, and normalized inventory are deployment gates.
Extraction, parse, canonicalization, or comparison failure is NO-GO.
The refreshed non-executing capture at `2026-08-10T07:41:02.540Z` produced inventory artifact
SHA-256 `4536185e796054faece72b0d5f2fc0aeca2cbe1fff0e6be0b3c2c78f17f74289` and summary
artifact SHA-256 `7a06a57fb9814ef10f0938c6118a9678e7699e00252bc316f0f76135b3d580bf` at the durable
path below.

### Raw loader bytes are evidence, not a gate

Google returned byte-distinct loader bodies to identical fixed requests while the canonical
`data.resource` remained unchanged. Observed raw sizes included `501,018` and `501,031` bytes with
multiple SHA-256 values. The workflow records raw response bytes, headers, length, and SHA-256 as
`secondary_non_gate`; raw hash variance alone is neither GO nor rollback.

### Published destinations requiring owner disposition

Resource version 21 includes more than GA4. The normalized inventory currently contains:

- GA4 `G-7HGHHBRHPT`;
- legacy Universal Analytics `UA-13018774-2` and Optimize `GTM-KXDQM43`;
- Ads tags `AW-866730806` and placeholder-looking `AW-123456789`, plus multiple conversion labels;
- Facebook Pixel `420290078314527` with an all-pages `PageView`;
- a Mailchimp popup loading `downloads.mailchimp.com` / `mc.us17.list-manage.com`;
- Vimeo tracking and history, click, scroll, link, form-submit, and video listeners.

No configured consent-default or consent-update tag was found in the 34-tag resource. Before the
production environment is approved, a named analytics owner must approve/export the exact
published version and full inventory, explicitly dispose of `AW-123456789`, and record the
consent/PII decision. The GTM publish surface must then be frozen through the release and soak.
The owner record is accepted only when it checksum-binds a regular in-repository GTM
export-format-v2 artifact for exact container `GTM-57RZPNN` / version `21` and retains an approved
entry for every one of the eight inventoried destination/consent surfaces.
The SHA-bound record is
[`gtm-owner-approval-2026-08-10.json`](gtm-owner-approval-2026-08-10.json); its current
`PENDING` state intentionally blocks dispatch.

## Implemented release controls

| Risk                                     | Durable control                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valid YouTube route rejected             | Plain and hydrated verifiers use route-specific identity, retain HTTP/release-SHA/title/media/error checks, and keep homepage-only `HEC-TV` proof                                                                                                                                                                                                                                               |
| Missing GTM or wrong ID                  | Build artifact plus normal and repeated fresh raw production HTML on both aliases require exactly `GTM-57RZPNN`, one loader/bootstrap, and no other/undefined GTM ID                                                                                                                                                                                                                            |
| Analytics pollution                      | Request interception is installed before navigation with cache and service workers disabled; only GET/HEAD requests for exact page/static paths, WordPress uploads, the reviewed HEC asset-library prefix, and the exact loader are allowed, HTTP plus WebSocket denial is integration-tested, and every other destination is blocked and recorded without interaction                          |
| Loader verification TOCTOU               | Chrome's exact loader request is intercepted, fetched by the verifier, semantically checked against the approved version/canonical hash/counts/inventory, and only then fulfilled to the page                                                                                                                                                                                                   |
| Mutable GTM control plane                | Public resource is compared before credentials, immediately before mutation, and after cutover using `canonical-resource-v1`                                                                                                                                                                                                                                                                    |
| Newsletter API reactivation              | General forms remain send-enabled (`HECMEDIA_NO_SEND_FORMS=false`), while targeted `HECMEDIA_NEWSLETTER_MODE=omit` removes only the reviewed newsletter route and keeps the CloudFront API behavior absent                                                                                                                                                                                      |
| New API routes hidden by packaging       | Targeted omit mode verifies `pages/api` contains exactly `newsletter/subscribe.js` before temporarily moving it for the legacy packager                                                                                                                                                                                                                                                         |
| S3 overwrite not rolled back             | Every existing collision is downloaded, SHA-256 verified, copied to a task/run/attempt/release-scoped preimage, downloaded and verified again, and bound in an uploaded manifest before sync                                                                                                                                                                                                    |
| New object cannot be deleted             | A new key is accepted only when build-ID/content-addressed or separately owner-approved by exact key; a new mutable/unapproved key is NO-GO                                                                                                                                                                                                                                                     |
| Candidate changes after preimage capture | The complete local asset tree key/size/SHA-256 inventory is sealed into build metadata, revalidated after artifact transfer and immediately before sync; remote collisions and absences are also revalidated immediately before sync, and every uploaded byte is verified before Lambda/CloudFront mutation                                                                                     |
| Partial rollback                         | Lambda/CloudFront and every S3 collision are attempted with aggregate evidence; any restore error skips the final invalidation, and public recovery starts only after exact version-150/API-absent CloudFront proof and complete S3 recovery                                                                                                                                                    |
| Wrong manual preimage                    | Manual rollback requires the original task ID, run ID, run attempt, release SHA, baseline release SHA/ETag, exact manifest key/hash, plus fresh current ETag/Lambda ARN/checksum/API state and proof the selected candidate is still live; `latest` inference is forbidden                                                                                                                      |
| Broken immutable tag                     | A tested controller preflights an absent or exact annotated tag before AWS, uploads required pre-tag evidence, persists the exact run/attempt-created immutable tag object before ref creation, and verifies the peeled commit as the terminal release operation. On recovery it deletes only a ref still pointing to that exact object; a concurrent tag object is preserved and fails closed. |
| Build dependencies holding AWS authority | Installation, lint, Jest, e2e, package build, pinned-Chrome setup, firewall self-test, and semantic GTM capture occur in a separate contents-read job with no protected environment, secret, OIDC, or write permission; the already-public reCAPTCHA site key is exact-value pinned, and the mutator consumes the sealed artifact without package installation                                  |
| Decommission overlap                     | Deploy requires a reviewed, SHA-bound in-repo observation closeout stating `Status: GO` and that the production HEC TV backend is unchanged and healthy                                                                                                                                                                                                                                         |

## Non-polluting browser acceptance

For every governed hydrated route, save:

- workflow run/job, verifier source SHA, browser path/version, route, and cache-bust token;
- the exact allowlist and exact loader request URL/status/count;
- `dataLayer` existence, bootstrap count, and `gtm.js` event count;
- every blocked request with UTC, URL, method, resource type, route, frame/initiator context when
  available, and block reason;
- console/CSP/page errors and the count of successful non-allowlisted requests;
- the declaration that no click, scroll, media play, form submit, `gtag` call, conversion, or
  manufactured Realtime hit occurred.

Acceptance requires one 2xx request for the exact loader, one bootstrap, one initial `gtm.js`
event, and zero successful non-allowlisted requests. Passive analytics-owner observation is
separate evidence; the automated smoke must not manufacture a Realtime visit.

## S3 recovery procedure

1. Require bucket versioning to already be enabled. The release is not authorized to change bucket
   configuration.
2. Inventory every candidate asset key and its local size/SHA-256.
3. For an existing key, download the current object, capture content metadata and VersionId as
   evidence, copy it to
   `_deployment-evidence/<task>/<run>/<attempt>/<release>/preimages/<original-key>`, download the copy, and
   prove matching bytes and metadata.
4. For an absent key, accept only build-ID/content-addressed output or an explicitly approved exact
   additive exception. Never treat all `static/**` as additive.
5. Upload and read back the manifest; record its exact key and SHA-256 in workflow evidence and the
   living log.
6. Revalidate both the sealed local tree and every remote collision/absence, then set the
   candidate-write fence immediately before `aws s3 sync --no-follow-symlinks`.
7. Download and hash every uploaded candidate object before publishing Lambda or changing
   CloudFront.
8. After any later failure, restore every collision from its exact preimage, verify the restored
   bytes/metadata, restore Lambda/CloudFront if touched, issue the final invalidation, and verify the
   sanitized public site.

The governed role intentionally lacks `ListBucketVersions`, `GetObjectVersion`, and `DeleteObject`.
Do not improvise a workstation VersionId restore or cleanup.

## Repeatable release sequence

1. Merge the remediation PR after foreign-family review and green exact-head evidence.
2. Merge a separately reviewed decommission observation closeout only after the observation
   deadline and unexplained legacy ELB traffic are resolved.
3. Record the named analytics owner's exact GTM export/inventory approval and publish freeze.
4. Freeze the exact `master` SHA; re-run lint, full Jest/coverage, read-only e2e, package build,
   artifact checks, browser self-test, and GTM semantic preflight before AWS credentials.
5. Re-capture CloudFront ETag/config, live default Lambda ARN/checksum, literal API value `none`, S3
   versioning, public release metadata, HEC TV backend health, AWS budget, provider flags, and absence
   of a concurrent production run.
6. Obtain a fresh positive queue-task receipt, every required unflagged-provider GO on the exact
   SHA/inputs, and Yomi's independent protected-environment approval.
7. Dispatch only `.github/workflows/production-deploy.yml` from exact `master`.
8. Preserve the complete workflow artifact, living-log PR, immutable release tag, post-cutover
   semantic GTM capture, browser/network evidence, AWS state, backend equivalence, and soak result.

## Durable evidence locations

The in-repository log is canonical for decisions and receipt hashes. Large artifacts live under an
expanded absolute commander deliverables path and in the GitHub Actions artifact. The planning and
implementation capture currently exists at:

`/Users/ytwguru/.openclaw/workspace-root/deliverables/hecmedia/gtm-production-deployment-plan-2026-08-10/`

Before claiming any phase complete, record the absolute path, run `ls -la`, hash material files,
and link those hashes from the living log. Do not rely on chat narration or a local untracked file.

## Remaining gates at this audit revision

- remediation PR merge and exact-head CI/review evidence;
- analytics-owner approval/export, placeholder Ads ID disposition, consent/PII decision, and GTM
  publish freeze;
- completed decommission observation closeout and classification of observed legacy ELB 5xx;
- fresh AWS/GitHub/backend/budget inputs and positive deployment task receipt;
- complete eligible-provider panel GO and protected-environment approval;
- governed cutover, acceptance, soak, immutable tag, and closeout PR.

Until every item is recorded as GO in the living log, production remains NO-GO.
