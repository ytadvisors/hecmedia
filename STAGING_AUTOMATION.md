# Staging deployment controller

The manual `HEC Media staging deployment` workflow can target only
`https://development.hecmedia.org`. It serializes runs, uses the protected
`hecmedia-staging` environment, runs lint, Jest coverage, read-only contracts,
a production build, deployment, and post-deploy verification. Forms are forced
into no-send mode. A successful verification updates the
`staging-last-known-good` tag; selecting `rollback` redeploys that exact SHA.

Production domains, CMS write credentials, mail credentials, invoices, and
client-send configuration are neither requested nor accepted by this workflow.

## One-time least-privilege access request

GitHub reports that `hecmedia-staging` does not exist and the repository has no
Actions secrets or variables. Create a protected `hecmedia-staging` environment
with HEC Media's required reviewers, then add only these environment secrets:

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
