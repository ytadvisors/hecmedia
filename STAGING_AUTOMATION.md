# Staging deployment controller

The manual `HEC Media staging deployment` workflow can target only
`https://development.hecmedia.org`. It serializes runs, uses the protected
`hecmedia-staging` environment, runs lint, Jest coverage, read-only contracts,
a production build, deployment, and post-deploy verification. Forms are forced
into no-send mode. A successful verification updates the
`staging-last-known-good` tag; selecting `rollback` redeploys that exact SHA.

Every dispatch must be initiated by Yomi's `ytwguru` GitHub account. The
authorization job runs before the environment-bearing deployment job, so an
unauthorized actor cannot reach the staging secrets or AWS credential step.
This repository's current GitHub plan does not expose required-reviewer rules
for its private environments; the actor gate is the enforceable compensating
control. If the plan later supports environment reviewers, add `ytwguru` as the
required reviewer with self-review prevention and retain this gate as defense
in depth.

Production domains, CMS write credentials, mail credentials, invoices, and
client-send configuration are neither requested nor accepted by this workflow.
Because forms are forced into no-send mode, the staging package temporarily
omits `pages/api` while building and restores it immediately afterward. This
keeps the deployment on the existing single Lambda@Edge function; send-enabled
and production builds retain the API routes.
The legacy packager still emits an `api-lambda` directory in this mode. The
deploy script discards it only when the directory is completely file-empty, or
after its manifest contains zero routes and its compiled `pages/api` tree
contains no files. A manifest-less directory containing any file, a malformed
manifest, or non-empty API output fails before AWS authentication.

The legacy packager also emits a separate image-optimizer Lambda whenever Next
uses its default image loader, even though this application has no `next/image`
imports. Staging sets `HECMEDIA_DISABLE_IMAGE_OPTIMIZER=true`, which selects the
non-optimizing Akamai loader only for this build and prevents that unused Lambda
from being packaged. Other builds keep Next's default loader, and the deploy
script continues to reject any generated `image-lambda` before AWS access.

## Least-privilege environment configuration

The `hecmedia-staging` environment contains only these environment secrets:

- `HECMEDIA_STAGING_AWS_ROLE_ARN` — OIDC role for this workflow.
- `HECMEDIA_STAGING_APOLLO_CLIENT_URI` — the site is SSR-only and has no
  separate staging WPGraphQL backend; per Yomi (2026-07-20) this reads
  production read-only: `https://prod-wp.hectv.org/graphql`.
- `HECMEDIA_STAGING_WP_HOST` — same read-only-production basis:
  `https://prod-wp.hectv.org`.
- `HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID` — distribution serving only
  `development.hecmedia.org`.

The workflow authenticates with GitHub OIDC via `HECMEDIA_STAGING_AWS_ROLE_ARN`;
it does not accept static AWS access keys or a static region secret. Its OIDC
trust policy must allow only `repo:ytadvisors/hecmedia:environment:hecmedia-staging`
with audience `sts.amazonaws.com`. Permissions are limited to the three existing
staging resources only — the named S3 bucket, the named Lambda@Edge function and
its versions, and the named CloudFront distribution and its invalidations. The
role has no IAM action of any kind, no Route 53, SES, or billing access, no
production resource ARNs, and no wildcard resources. The CloudFront distribution
must list exactly `development.hecmedia.org` as its alias.

Related work: #68041, #68042, #68043, #68044, #68045, #68046, #68047, #68048,
#68049, #68050, #68051. Staging directive: `phase0-D3-access-and-preview.md`.
