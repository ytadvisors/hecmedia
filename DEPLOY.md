# Deploy & Rollback

Before the next HEC Media production release, review and approve the
[2026-08-06 production release playbook](docs/operations/production-release-playbook-2026-08-06.md)
and its [incident report/RCA](docs/incidents/2026-08-06-production-deployment.md). The playbook's
cross-repository compatibility gates and stop conditions supplement this workflow reference.

> **NEXT 12 DEPLOYMENT BOUNDARY — GOVERNED WORKFLOWS ONLY**
>
> The `upgrade/next16` compatibility checkpoint upgrades the application runtime to
> Next.js 12, but this repository still packages Lambda@Edge with the Next-9-era
> `@sls-next/serverless-component@1.19.1-patch.1` /
> `@sls-next/lambda-at-edge@1.4.1-alpha.2` stack. Do not run `yarn deploy`,
> `serverless`, or any full-stack production deployment from that checkpoint.
>
> The approved staging path is a `workflow_dispatch` of
> `.github/workflows/staging-deploy.yml` for an exact merged commit and a positive HEC
> Media queue-task receipt. That workflow builds on Node 24, disables staging form
> sends and the unused image optimizer, verifies the expected Lambda package contract,
> refuses extra Lambda bundles, updates only the three existing staging resources,
> waits for CloudFront propagation, and verifies rendered and hydrated routes. The
> deploy script rejects mutation outside that governed workflow before its first AWS
> write. Direct workstation use of `node scripts/staging-deploy.js deploy` is not an
> approved workaround.
>
> Production uses `.github/workflows/production-deploy.yml` from the exact protected
> `master` tip. GitHub's `production` environment requires an independent owner
> approval, prevents self-review, and permits only `master`. The workflow compares the
> authorized CloudFront ETag, versioned Lambda ARN, and Lambda checksum before any
> public cutover; scans the uncompressed package for AWS access keys; enables S3
> versioning; updates only existing production resources; verifies rendered and
> hydrated routes; and automatically restores the immutable sanitized Lambda version
> `147` if post-cutover verification fails. Direct workstation production mutation is
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
It is not approved while the checkpoint above remains active. Staging and production publishes
use only their governed, existing-resource workflows.

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
`hecmedia-production-<12-character-sha>` tag and uploads release evidence.

Manual rollback uses the same workflow with `action=rollback` and the literal confirmation
`ROLLBACK HEC FRONTEND PRODUCTION`. It verifies the immutable checksum of version `147`, moves all
four owned SSR associations to that version, removes the newsletter API behavior, waits for
CloudFront and invalidation completion, and verifies the public homepage. Never infer a rollback
target as version N-1.

## Governed staging publish and rollback

Dispatch `.github/workflows/staging-deploy.yml` from an approved publisher. A deploy requires
`action=deploy`, the exact merged commit SHA in `ref`, and the positive HEC Media queue task ID
that records the staging authorization. The workflow records deploy evidence and moves
`staging-last-known-good` only after verification succeeds.

Rollback uses the same workflow with `action=rollback` and a positive authorization task ID.
The workflow ignores `ref`, deploys `staging-last-known-good`, and runs the same verification
before recording a new outcome. Do not move the tag or invoke the deploy script directly.

## Legacy full-stack rollback (blocked)

The historical rollback was another full Serverless Components deployment from an older commit.
That procedure remains blocked and is not a recovery option. Do not run `yarn deploy`, do not
select version N-1, and do not move a release tag. Use the protected rollback action above; its
target and checksum are reviewed in source and the workflow records the result.

Production tags are written only after the governed verifier succeeds. The deterministic tag
`hecmedia-production-<12-character-sha>` identifies the exact commit that reached production; it
is evidence, not the rollback selector.
