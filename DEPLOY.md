# Deploy & Rollback

Before the next HEC Media production release, review and approve the
[2026-08-06 production release playbook](docs/operations/production-release-playbook-2026-08-06.md)
and its [incident report/RCA](docs/incidents/2026-08-06-production-deployment.md). The playbook's
cross-repository compatibility gates and stop conditions supplement this workflow reference.

The current GTM restoration release is governed by the
[2026-08-10 GTM production deployment playbook](docs/operations/gtm-production-deployment-playbook-2026-08-10.md).
Its [living deployment log](docs/operations/gtm-production-deployment-log-2026-08-10.md) records
the exact gate and execution receipts.
For this release, the owner narrowed execution to the merged media and GTM changes plus the
route-verifier, immutable-tag, and live browser acceptance corrections described below. The
larger proposed external recovery/preimage architecture remains deferred and must not be inferred
from this release. The protected environment and exact green workflow remain mandatory.

> **NEXT 12 DEPLOYMENT BOUNDARY — PRODUCTION WORKFLOW ONLY**
>
> The `upgrade/next16` compatibility checkpoint upgrades the application runtime to
> Next.js 12, but this repository still packages Lambda@Edge with the Next-9-era
> `@sls-next/serverless-component@1.19.1-patch.1` /
> `@sls-next/lambda-at-edge@1.4.1-alpha.2` stack. Do not run `yarn deploy`,
> `serverless`, or any full-stack production deployment from that checkpoint.
>
> Frontend staging publishing is retired. This repository has no staging deploy
> workflow, deployment script, or rollback entrypoint, and those paths must not be
> recreated. Existing staging cloud resources remain live until the separately
> approved Phase 2 teardown is executed and verified; their continued existence is
> not permission to publish to them.
>
> Production uses `.github/workflows/production-deploy.yml` from the exact protected
> `master` tip. GitHub's `production` environment requires an independent owner
> approval, prevents self-review, and permits only `master`. The workflow compares the
> authorized CloudFront ETag, versioned Lambda ARN, and Lambda checksum before any
> public cutover; scans the uncompressed package for AWS access keys; enables S3
> versioning; updates only existing production resources; verifies rendered and
> hydrated routes; and automatically restores the immutable sanitized Lambda version
> `150` if post-cutover verification fails. Direct workstation production mutation is
> not an approved workaround. A green build or test alone is not permission to ship.

## Legacy full-stack deployment (blocked)

This site deploys via the **Serverless Components** framework (`serverless.yml` uses the
`@sls-next/serverless-component@1.19.1-patch.1` component, not the classic Serverless Framework
CloudFormation stack). Its historical deploy command is:

```shell
yarn deploy   # BLOCKED at the Next 12 checkpoint
```

This builds the Next.js app and pushes Lambda@Edge functions + a CloudFront distribution + S3
static assets, driven by env vars `APOLLO_CLIENT_URI`, `SUBDOMAIN`, `DOMAIN` (see `serverless.yml`).
It is not approved while the checkpoint above remains active. Production publishes
only through its governed existing-resource workflow; staging has no repository deploy path.

**Important distinction:** Serverless Components does not use CloudFormation stacks. There is
**no `serverless rollback -t <timestamp>` command** for `@sls-next` deployments — that command only
exists for the classic (v1/v2) Serverless Framework, which this repo does not use. The governed
production rollback is an explicit CloudFront reassociation to a pinned, checksum-verified
sanitized Lambda version; the historical Serverless path has no supported rollback operation.

## Governed production publish and rollback

Dispatch `.github/workflows/production-deploy.yml` only from `master`. A deploy requires the
exact `master` SHA, the CloudFront ETag captured immediately before approval, the exact live
default Lambda@Edge version ARN and `CodeSha256`, the exact live newsletter API version ARN (or
`none` when the behavior is absent), a positive HEC Media queue-task receipt, and the literal
confirmation `DEPLOY HEC FRONTEND PRODUCTION`.

The workflow packages before receiving AWS credentials. Its OIDC role can update only S3 bucket
`x2l4ew-k0m7umi`, Lambda functions `x2l4ew-l5vb7pd` and `x2l4ew-api`, and CloudFront distribution
`E2QXRSF2W55RTS`. It cannot create infrastructure, modify IAM or Route 53, read Secrets Manager,
or delete S3 objects. A successful release receives an immutable
`hecmedia-production-<12-character-sha>` annotated tag, written with the deterministic
`yt-agent-tom-grok` automation identity and verified through its exact remote tag object and peeled
40-character release SHA. An exact existing tag is accepted idempotently; lightweight, wrong-SHA,
wrong-message, or wrong-identity tags fail closed. The workflow also uploads release evidence.

For a deploy action, the protected-environment approval prompt appears only after a separate
no-credential media preflight resolves the candidate's live Spotlight and representative category
image URLs and confirms that they return images. The protected job reruns the full tests before it
receives AWS credentials or mutates production. After cutover, hydrated content routes must contain
managed upload media, all rendered remote `src` and `srcset` candidates must return images, and
utility routes may record an empty media inventory.

Post-cutover acceptance also launches the pinned real Chrome binary through Playwright on the
homepage, `/posts/hec-on-youtube`, and `/newsletter`. It requires hydrated route-appropriate
identity, primary navigation, representative content/media, the HEC on YouTube link, and the
send-enabled newsletter form controls without submitting the form. On every representative route
it requires exactly one request for
`https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN`, requires that exact resource to return
HTTP 200, and requires exactly one `window.dataLayer` `gtm.js` bootstrap with a numeric `gtm.start`.
It permits no other/undefined GTM ID and no console, CSP, or runtime error. The verifier permits the
exact GTM loader plus reviewed first-party, media, stylesheet, and
reCAPTCHA resources; it aborts and records every other third-party request so acceptance does not
manufacture analytics, advertising, popup, or social-pixel events. Expected blocked-resource
messages are recorded separately and do not mask CSP, console, or runtime errors. Raw HTTP/HTML
checks remain supporting fail-closed evidence, not a substitute for the browser result. The browser
evidence is uploaded as
`.production-release/browser-acceptance.json`.

Manual rollback uses the same workflow with `action=rollback` and the literal confirmation
`ROLLBACK HEC FRONTEND PRODUCTION`. It verifies the immutable checksum of version `150`, moves all
four owned SSR associations to that version, removes the newsletter API behavior, waits for
CloudFront and invalidation completion, and verifies the public homepage. Never infer a rollback
target as version N-1.

**Accepted S3 rollback limitation for this release:** the current automatic rollback restores
Lambda/CloudFront but does not restore objects overwritten by the preceding `aws s3 sync`. The
owner explicitly accepted that existing governed rollback for this narrowly scoped GTM/media
release; this is not approval of the deferred S3 preimage or external recovery design. Preserve the
captured baseline and release artifacts, stop on any gate failure, and do not improvise workstation
or inferred-VersionId recovery.

## Staging publishing retired

There is no supported dispatch, script, release tag, or rollback action for frontend staging.
Do not restore the former staging workflow, invoke the legacy full-stack deployment, or infer
that a live staging resource is an approved release target. Any temporary recovery or evidence
capture must be explicitly authorized by the Phase 2 execution playbook and must not recreate a
general-purpose staging publisher.

## Legacy full-stack rollback (blocked)

The historical rollback was another full Serverless Components deployment from an older commit.
That procedure remains blocked and is not a recovery option. Do not run `yarn deploy`, do not
select version N-1, and do not move a release tag. Use the protected rollback action above; its
target and checksum are reviewed in source and the workflow records the result.

Production tags are written only after the governed verifier succeeds. The deterministic tag
`hecmedia-production-<12-character-sha>` identifies the exact commit that reached production; it
is evidence, not the rollback selector.
