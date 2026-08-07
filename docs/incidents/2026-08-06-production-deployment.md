# Incident report and RCA: HEC Media intermittent 404/500 during production deployment

**Incident date:** 2026-08-06

**Proposed severity:** SEV-1 — public-site availability

**Status:** Resolved; corrective actions open

**Primary service:** `https://hecmedia.org`

**Related services:** `prod-wp.hectv.org`, `staging-wp.hectv.org`, `development.hecmedia.org`

## Executive summary

An incompatible WordPress backend release reached production before the matching frontend. The
live Lambda@Edge frontend continued issuing GraphQL operations that the new production backend no
longer supported. Previously cached pages remained available, but fresh SSR requests frequently
rendered a 404/500 error page. A 20-request cache-busting probe reproduced 16 failures and 4
successes during the incident.

The backend had passed staging because staging enabled a compatibility plugin only when
`HECTV_ENVIRONMENT=staging`; production disabled that plugin. The same image digest therefore
exposed different GraphQL behavior by environment. ECS and ALB also remained green because their
health path was a static `/healthz` file that did not boot WordPress or execute a consumer query.

Production was restored to the exact prior ECS task definition and image digest. Once the
incompatible tasks were removed, 20/20 fresh homepage probes passed. A CloudFront invalidation was
completed, and final public checks returned HTTP 200 with title `HEC-TV | Home`.

During recovery work, a separate candidate image was deployed to staging. It passed static health
but returned empty HTTP 200 responses for all WordPress routes. Post-incident image inspection
confirmed that several WordPress core files were zero bytes. The image had been built after the
local Docker disk filled and its ext4 journal/cache reported I/O corruption. Staging was restored
to its previous task definitions; the corrupted image never reached production.

## Customer impact

- Public readers could receive `404 not found` or a Next.js error page on fresh SSR requests.
- Cached pages continued to return HTTP 200, making impact intermittent and location/cache-key
  dependent.
- The user's browser captured a public 404 at approximately 17:26 CT.
- A controlled cache-busting probe during the incident failed 16 of 20 requests (80%). This is a
  reproduction rate, not a measured percentage of real users.
- Exact request/user impact cannot be reconstructed because CloudFront standard access logging was
  disabled. Lambda@Edge logs confirm repeated schema and render errors.
- No evidence indicates data loss, unauthorized writes, email sends, payment activity, DNS change,
  credential exposure, or database schema mutation.

## Detection

The incident was detected by the user through a browser screenshot showing `404 not found` on
`hecmedia.org`. Initial command-line checks hit cached 200 responses; cache-busting requests then
reproduced the fault. Lambda@Edge logs identified the GraphQL schema mismatch.

Monitoring did not alert because:

1. ECS/ALB checked a static file and remained healthy.
2. Cached CloudFront responses continued succeeding.
3. No end-to-end fresh SSR availability alarm covered the public routes.
4. CloudFront access logging was disabled.

## Timeline (America/Chicago)

| Time | Event |
| --- | --- |
| ~16:59 | First confirmed Lambda@Edge schema/render errors during the backend rollout |
| 17:06 | ECS reported the new production backend rollout steady, despite consumer incompatibility |
| 17:26 | User captured and reported a public `404 not found` response |
| ~17:28 | Cache-busting probes reproduced 404/500 responses; Lambda logs confirmed missing GraphQL fields |
| ~17:29 | Production backend rollback to task definition revision `:3` initiated |
| 17:31 | Incompatible revision `:4` reached zero running tasks; baseline revision `:3` served all traffic |
| 17:34 | CloudFront invalidation `ID3MOBT87FD3HR3WGDF6TFK48B` created for `/*` |
| ~17:34 | Post-rollback cache-busting probe passed 20/20 requests |
| ~17:35 | Both staging services began rollback from candidate revision `:33` to known-good `:32` |
| 17:37 | Bad staging tasks stopped; both staging services returned to one healthy `:32` task |
| ~17:38 | Staging GraphQL, REST, and rendered frontend checks returned real HTTP 200 responses |
| ~17:39 | CloudFront invalidation verified complete; final production and staging checks returned HTTP 200 |
| 17:46 | Read-only image comparison confirmed zero-byte WordPress core files in the rejected staging image |

Times prefixed with `~` are bounded by command/log observations rather than a single authoritative
event record.

## Changes involved

### Production backend release that triggered the incident

- Workflow run: `https://github.com/ytadvisors/hectv-wp/actions/runs/31128405532`
- Release SHA: `f940fdfe94e595860198829cd6dfd50bb3f73f30`
- Promoted digest: `sha256:e7a885f156a60e6e1425c1c7ef12682cf22383b23b2fb9d92c1b7ebbb3907bd3`
- New task definition: `hectv-wp-production-rollback-pr34-safe:4`
- Recovery task definition: `hectv-wp-production-rollback-pr34-safe:3`
- Recovery digest: `sha256:b0764544d2a46fa51e2a325b181d53bb66a251cb354090b10ba1d6955dc38d36`
- Recovery image source label: `d0b939ec0186a23e4ce10014aeaf10c738af7b59`

### Frontend state during the incident

- CloudFront distribution: `E2QXRSF2W55RTS`
- Lambda@Edge version: `arn:aws:lambda:us-east-1:850335719356:function:x2l4ew-l5vb7pd:146`
- Lambda code SHA: `5CzpPZ0xXqsNoDJ+Nr8mzRuY9kUKNkIKF6bovFjKsS4=`
- Runtime: Node.js 12
- The attempted frontend workflow run `31128539888` failed in pre-credential validation and did
  not mutate CloudFront.

### Separate rejected staging image

- Backend SHA: `84919f0d918db9149d8c042b4df93573ea27988a`
- Rejected digest: `sha256:beba7812ee56969a4646d09c5afb01ccef4d525e8e5968e2307b140fab664a83`
- Staging task definitions: public/admin revision `:33`
- Restored task definitions: public/admin revision `:32`
- The rejected image was never deployed to production.

## Root cause analysis

### Primary root cause: incompatible release ordering

The backend schema changed before a compatible frontend was live. Lambda@Edge version `146`
continued querying fields missing from the new production schema. Logged examples included:

- `PostToCategoryConnectionWhereArgs.shouldOutputInFlatList`
- `Event.excerpt`

Apollo's SSR data pass logged GraphQL errors; page components then dereferenced missing data and
rendered the Next.js error page. CloudFront returned those failures for fresh cache keys while old
cached HTML remained available.

### Why staging did not catch the production failure

The staging image included `staging-harness/mu-plugins/hectv-graphql-compat.php`, activated only in
the staging environment. Production ran the same image digest with a different environment and
without that compatibility behavior. As a result:

- staging proved the frontend against a compatibility-expanded schema;
- production exposed the modernized schema without the legacy fields;
- promotion by identical digest did not imply identical application behavior.

The release process treated image identity as environment parity, but environment-conditioned code
made that assumption false.

### Why automated health and rollback did not catch it

The ECS container health check and target-group path used `/healthz`, a static file copied into the
image. It verified network reachability and Apache, but did not:

- boot WordPress;
- connect through the application DB path;
- execute GraphQL or REST;
- exercise the deployed frontend's consumer contract;
- render a fresh SSR page.

ECS therefore marked the rollout healthy. The backend workflow had no post-cutover consumer-driven
frontend test capable of triggering its rollback for this failure class.

### Separate staging root cause: corrupted build cache after disk exhaustion

The local host filled during an ARM64 image build. Kernel and Colima logs recorded block I/O errors,
an aborted ext4 journal, and BuildKit/containerd metadata errors. After space was reclaimed and the
VM remounted, a subsequent build completed and pushed a valid image manifest. However, the builder
had reused damaged layer content.

A post-pull comparison established:

| File | File-integrity reference `e7a885…` (not production-contract safe) | Rejected image `beba781…` |
| --- | ---: | ---: |
| `/var/www/html/index.php` | 405 bytes | 0 bytes |
| `/var/www/html/wp-blog-header.php` | 351 bytes | 0 bytes |
| `/var/www/html/wp-load.php` | 3,937 bytes | 0 bytes |
| `/var/www/html/wp-settings.php` | 32,650 bytes | 0 bytes |

Apache executed the zero-byte `index.php`, returned HTTP 200 with an empty body, and reported no PHP
fatal error. The static `/healthz` file remained non-empty, so ECS again reported green. ECR and
Docker accepted the image because zero-byte files are valid filesystem content; digest integrity
proves immutability, not semantic correctness.

Follow-up inspection after space was reclaimed found approximately 40 GiB free on the host and
54 GiB free on the Colima Docker volume, so capacity is no longer the limiting factor. The default
Colima ext4 filesystem still records the prior I/O failure, reports that a filesystem check is
recommended, and has an error count of three. That builder remains quarantined even though Docker
is responsive and sufficient free space is visible.

## Five whys

1. **Why did users see 404/500?** Fresh Lambda@Edge SSR requests rendered an error page.
2. **Why did SSR fail?** Its GraphQL operations requested fields absent from the live backend and
   page code consumed incomplete data.
3. **Why were the fields absent?** The modernized backend reached production before a compatible
   frontend or a production-safe legacy compatibility expansion.
4. **Why did staging approve it?** Staging enabled compatibility code that production disabled, and
   the gate treated an identical image digest as identical behavior.
5. **Why was there no automatic recovery?** Infrastructure health checked a static file and no
   current-frontend contract or fresh SSR probe gated the backend rollout.

For the staging image:

1. **Why were WordPress routes empty?** Core PHP entry files were zero bytes.
2. **Why were they zero bytes?** The builder used corrupted local layer/cache content after disk
   exhaustion and ext4 I/O failure.
3. **Why did the build pass?** Docker can package empty files and verify their digests successfully.
4. **Why did staging pass health?** `/healthz` was separate, static, and intact.
5. **Why was corruption not detected before push?** The build pipeline lacked core-file checksum,
   non-empty-file, post-pull, and application boot checks.

## Contributing factors

- Backend and frontend were treated as independent deployables despite a coupled GraphQL contract.
- The frontend deployment preflight ran only after the backend was already serving production.
- Production and staging compatibility behavior differed by an implicit environment condition.
- Cached responses masked the outage during ordinary single-request checks.
- CloudFront standard access logging was disabled, limiting impact measurement.
- The production Lambda@Edge runtime is Node.js 12, increasing operational risk and complicating
  support, although it did not cause this incident.
- The current production frontend did not expose a trustworthy source-SHA marker, so its immutable
  Lambda version and checksum were the only reliable baseline identifiers.
- Manual recovery pressure encouraged sequential fixes without one reviewed cross-repository
  release plan.

## Resolution and verification

### Production

1. Updated ECS back to `hectv-wp-production-rollback-pr34-safe:3`.
2. Waited until all four baseline tasks were healthy and incompatible revision `:4` had zero tasks.
3. Ran 20 unique cache-busting homepage probes; 20/20 returned HTTP 200.
4. Invalidated CloudFront `/*` with invalidation `ID3MOBT87FD3HR3WGDF6TFK48B` and verified it
   completed.
5. Verified the public title was `HEC-TV | Home` and the production rollout was complete.

### Staging

1. Rolled public and admin services from revision `:33` back to `:32`.
2. Waited for one running task, zero pending tasks, and completed rollout in each service.
3. Verified GraphQL returned `generalSettings.title = "HEC Media"`.
4. Verified REST posts returned non-empty JSON.
5. Verified `development.hecmedia.org` returned rendered HTTP 200 HTML.
6. Pulled both the nonzero file-integrity reference and rejected image and confirmed the zero-byte
   core-file defect. The reference image remained production-contract unsafe without the additive
   GraphQL compatibility expansion.

## What went well

- The user reported the visible failure quickly.
- Immutable task definitions and image digests made rollback deterministic.
- ECS rolling replacement preserved capacity during recovery.
- The prior backend workflow recorded a rollback task definition.
- CloudFront invalidation completed successfully after backend restoration.
- The failure was reproducible with cache-busting probes and attributable in Lambda logs.
- The rejected staging image never reached production.

## What failed

- Release ordering did not preserve frontend/backend compatibility.
- Staging was not production-representative for GraphQL behavior.
- Static health checks were interpreted as application health.
- The backend deploy had no current-frontend consumer gate.
- The image build trusted a cache after a filesystem I/O incident.
- Image verification checked digest/architecture but not core file contents or application boot.
- Initial cached 200 responses delayed recognition of the public failure.
- There was no single reviewed cross-repository execution playbook before mutation.

## Learnings

1. **An identical container digest does not guarantee environment parity.** Environment-conditional
   plugins can change the API contract completely.
2. **Deploy consumers before breaking providers—or expand the provider first.** GraphQL field
   removal requires an expand/contract release, never a backend-first cutover.
3. **Infrastructure health and application health are different signals.** A static file is useful
   for liveness but cannot authorize a CMS release.
4. **Cache-aware verification is mandatory for edge SSR.** Always test fresh cache keys, multiple
   requests, and hydrated routes.
5. **A digest proves exact bytes, not correct bytes.** Semantic image integrity requires file,
   checksum, boot, API, and post-pull tests.
6. **A builder that experienced ENOSPC/I/O corruption is quarantined.** Restarting the daemon does
   not make its cache trustworthy.
7. **Cross-repository releases need one commander and one plan.** Backend, frontend, CloudFront,
   and rollback order must be reviewed together.

## 2026-08-07 follow-up: production media-origin regression

**Status:** Mitigation and release-gate fixes prepared; production deployment pending review

At approximately 04:29–04:32 CT on 2026-08-07, post-release visual inspection found missing
thumbnail images on older Two on the Aisle cards, the Spotlight listing, and the Spotlight STL
sidebar. The affected pages and text content remained available, but the browser rendered broken
image placeholders or text-only cards.

### Follow-up RCA

WordPress returned valid attachment metadata whose URLs used
`https://prod-wp.hectv.org/wp-content/uploads/...`. Those exact production WordPress/EFS URLs
returned HTTP 404. Read-only object checks found the same upload paths intact and returning
`image/*` responses from the public archive at
`https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/...`.

The frontend already had a media-origin compatibility function, but it canonicalized only the
staging WordPress upload host to the public S3 archive. When the release switched content reads to
the production WordPress backend, production-host attachment URLs bypassed that mapping and were
rendered directly against the incomplete EFS origin. No object loss was found in the public S3
archive.

The earlier header-image sizing change was inspected and is not the regression boundary. It kept
article-page hero selection separate from card-thumbnail selection. The relevant boundary is the
staging-only host condition in the shared media URL compatibility code.

### Why validation did not catch it

The release gates proved HTTP page availability, GraphQL schema compatibility, response shape,
navigation, and absence of browser exceptions. They did not dereference the media URLs returned by
GraphQL, require an `image/*` response, inventory the images present in hydrated pages, or fail the
release when an image request returned 404. A syntactically valid GraphQL URL therefore passed even
though the browser could not load the object.

### Follow-up corrective controls

| Control                                                                                                                                                          | Failure class covered                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Canonicalize staging and production WordPress upload URLs to the public S3 archive                                                                               | Incomplete environment-specific upload origins                                           |
| Use a finite component fallback chain: public archive → active WordPress origin → local placeholder                                                              | New media awaiting archive propagation without retry loops                               |
| Before protected-environment approval, resolve the real Spotlight and representative category-card URLs, perform ranged GETs, and require successful `image/*` responses | Valid metadata pointing to missing or non-image content                                  |
| After cutover, extract every remote `src` and `srcset` candidate, require managed upload media on content routes, probe each unique remote URL, and save the route inventory | Rendering changes that bypass the shared resolver or expose route-specific broken assets |

This follow-up changes the acceptance criterion from “the page and query returned 200” to “the
candidate-selected media objects loaded as images before environment approval, and the actually
rendered media objects loaded as images after cutover.” Any 404, request failure, missing media on
a required content surface, or non-image response is a release failure. Utility routes such as the
newsletter may have an empty remote-media inventory.

## Corrective and preventive actions

### P0 — required before the next production attempt

| Action | Owner | Completion evidence |
| --- | --- | --- |
| Assign exactly one approved production deployment commander per attempt | Yomi / Tom | Co-signed playbook, named executor, and other lanes confirmed read-only |
| Add production-safe dual-schema compatibility | Backend owner | Reviewed PR and legacy + modern consumer tests |
| Remove staging-only contract drift | Backend owner | Identical schema-profile evidence in staging and production candidate configs |
| Rebuild on a pristine no-cache builder | Selected executor | New SHA-tagged digest plus builder provenance |
| Add non-empty core-file and WordPress checksum tests | Backend owner | Pre-push and post-pull results |
| Add real GraphQL, REST, and SSR release gates | Frontend + backend owners | Four-way compatibility matrix and 20/20 fresh probes |
| Add pre-approval and post-cutover media-object gates | Frontend owner | Live GraphQL-selected media probes plus hydrated route-to-image evidence |
| Prove immutable rollback targets | Selected executor | Lambda version/checksum and ECS task definition/digest evidence |

### P1 — within 24 hours

| Action | Owner | Completion evidence |
| --- | --- | --- |
| Separate liveness from readiness; make readiness boot WordPress read-only | Backend owner | ECS/ALB config and failure-mode test |
| Add backend post-cutover consumer contract and automatic rollback | Backend owner | Workflow test that rejects a missing frontend field |
| Add cache-busting public availability monitor | Platform owner | Alarm and synthetic route results |
| Enable suitable CloudFront access/error observability | Platform owner | Reviewed logging/metrics configuration and retention |
| Record source SHA in every production SSR response | Frontend owner | Verified metadata on all required routes |
| Quarantine the damaged Docker cache and rejected digest | Platform owner | Builder replacement evidence and denylist/runbook entry |
| Keep the default Colima builder out of the release path | Selected executor | New isolated/remote builder identity and healthy filesystem evidence |

### P2 — within 7 days

| Action | Owner | Completion evidence |
| --- | --- | --- |
| Upgrade the production Lambda@Edge runtime from Node.js 12 | Frontend owner | Staging soak and governed production plan |
| Add canary/weighted backend validation before full rollout | Platform/backend owners | Proven rollback test and consumer probe |
| Add a cross-repository release manifest | Platform owner | One signed record of frontend SHA, backend SHA/digest, schema profile, and rollback pair |
| Exercise a game-day rollback | Selected executor + independent reviewer | Timed evidence without customer impact |
| Add disk-capacity and builder-filesystem alarms | Platform owner | Alert test and cache quarantine behavior |

## Evidence references

- Backend deployment run: `https://github.com/ytadvisors/hectv-wp/actions/runs/31128405532`
- Failed frontend preflight run: `https://github.com/ytadvisors/hecmedia/actions/runs/31128539888`
- Backend REST fix: `https://github.com/ytadvisors/hectv-wp/pull/58`
- Backend Guzzle fixes for alerts #186/#187: `https://github.com/ytadvisors/hectv-wp/pull/57`
- Frontend production-contract test update: `https://github.com/ytadvisors/hecmedia/pull/256`
- Local immutable backend deployment evidence:
  `~/.openclaw/workspace-tom-gpt/deliverables/hecmedia/backend-run-31128405532/production-deploy-evidence.json`
- Recovery invalidation: `ID3MOBT87FD3HR3WGDF6TFK48B`

## Final current state

At report preparation time:

- production frontend returned HTTP 200 with title `HEC-TV | Home`;
- production backend was stable on revision `:3`, digest `b0764544…`;
- staging public/admin were stable on revision `:32`, digest `e7a885f…`;
- staging GraphQL, REST, and rendered frontend returned real HTTP 200 responses;
- CloudFront invalidation was complete;
- no further production release was in progress.

The incident is resolved. The release remains pending the reviewed playbook and all P0 gates.
