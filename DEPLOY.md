# Deploy & Rollback

Before the next HEC Media production release, review and approve the
[2026-08-06 production release playbook](docs/operations/production-release-playbook-2026-08-06.md)
and its [incident report/RCA](docs/incidents/2026-08-06-production-deployment.md). The playbook's
cross-repository compatibility gates and stop conditions supplement this workflow reference.

The current GTM restoration release is governed by the
[2026-08-10 GTM production deployment playbook](docs/operations/gtm-production-deployment-playbook-2026-08-10.md).
Its [living deployment log](docs/operations/gtm-production-deployment-log-2026-08-10.md) records
the exact gate and execution receipts.
The [2026-08-10 deployment audit](docs/operations/gtm-production-deployment-audit-2026-08-10.md)
preserves the investigation, control rationale, GTM semantic freeze, and repeatable evidence
procedure so those findings do not have to be reconstructed from chat or old workflow logs.
That playbook is NO-GO until all B1–B11 prerequisites and its execution-authority gate are cleared;
its approval alone is not permission to dispatch production.

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
> public cutover; scans the uncompressed package for AWS access keys; requires S3
> versioning; updates only existing production resources; verifies rendered and
> hydrated routes; arms an independent recovery watchdog before any candidate write; and
> automatically restores immutable sanitized Lambda version `150` plus bound mutable-S3 preimages
> for failure, cancellation, timeout, or mutating-runner loss after the write fence. Direct
> workstation production mutation is
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
`none` when the behavior is absent), the analytics-owner-approved GTM resource version and
`canonical-resource-v1` SHA-256, exact resource counts and normalized-inventory SHA-256, the
SHA-256 of the reviewed in-repo GTM owner/export/freeze record, a reviewed
decommission-observation closeout SHA-256, a positive
HEC Media queue-task receipt, and the literal confirmation `DEPLOY HEC FRONTEND PRODUCTION`.

Dependency installation, tests, packaging, pinned Chrome setup, firewall integration proof, and
the first semantic GTM capture run in a contents-read job with no OIDC or write permission. The
AWS mutator downloads and revalidates the sealed candidate but performs no package installation or
browser execution. Public Chrome verification runs without OIDC; terminal tagging has GitHub write
authority but no AWS authority. An independent `always()` AWS watchdog validates an immutable
controller/ready/fence handshake before any candidate write and covers cancellation, timeout, and
mutating-runner loss. The OIDC role can update only S3 bucket
`x2l4ew-k0m7umi`, Lambda functions `x2l4ew-l5vb7pd` and `x2l4ew-api`, and CloudFront distribution
`E2QXRSF2W55RTS`. This release publishes only the frontend Lambda and keeps the newsletter API
behavior absent. The role cannot create infrastructure, modify IAM or Route 53, read Secrets
Manager, list/read noncurrent S3 versions, or delete S3 objects. A successful release uploads
required pre-tag evidence and then creates/verifies the immutable annotated
`hecmedia-production-<12-character-sha>` tag as the terminal operation. Automatic tag deletion is
forbidden because GitHub ref deletion has no compare-and-swap precondition; an exact terminal tag
is accepted only when the terminal tag job itself is green. Any non-success tag job restores
production and preserves an exact or ambiguous tag for reviewed resolution.

For a deploy action, a no-credential media preflight resolves the candidate's live Spotlight and
representative category image URLs and confirms that they return images. The credential-free
candidate-build job runs the full checks with no protected environment, secrets, OIDC, or write
authority; its reCAPTCHA site key is public, already shipped in the client bundle, and exact-value
pinned. The later protected mutator consumes its sealed artifact. After cutover, hydrated content routes must contain
managed upload media, all rendered remote `src` and `srcset` candidates must return images, and
utility routes may record an empty media inventory.

Manual rollback uses the same workflow with `action=rollback` and the literal confirmation
`ROLLBACK HEC FRONTEND PRODUCTION`. It verifies the immutable checksum of version `150`, moves all
four owned SSR associations to that version, removes the newsletter API behavior, waits for
complete S3 preimage restoration before issuing the final invalidation, and verifies both aliases
with normal and fresh-query responses for the baseline release SHA, GTM absence, and newsletter
API absence. Never infer a rollback target as version N-1.

**S3 rollback warning:** the deploy role cannot list or read a noncurrent S3 VersionId. Before any
candidate upload, the governed workflow must conditionally copy every current colliding/mutable object to its exact
task/run/attempt/release-scoped preimage, download and verify matching bytes/metadata, and bind the
uploaded manifest to the original task, run, attempt, release SHA, baseline public SHA/ETag,
manifest key, and manifest SHA-256. Preimage/manifest destinations require absence; candidate
collisions require the captured ETag and additive keys require absence. Automatic and manual
rollback restore those verified preimages as new current versions only while destinations remain
the exact candidate, before the final invalidation. Unknown drift fails closed and suppresses
invalidation. New mutable/unapproved keys are NO-GO because the role cannot delete them.
Manual rollback must also prove fresh current ETag/default ARN/checksum/API state, the affected
public candidate SHA, and candidate S3 bytes before mutation. It must supply the original immutable
selector; never infer “latest.” Direct
workstation or improvised VersionId recovery is not supported.

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
