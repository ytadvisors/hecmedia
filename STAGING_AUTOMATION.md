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
- `HECMEDIA_STAGING_APOLLO_CLIENT_URI` — staging WPGraphQL endpoint.
- `HECMEDIA_STAGING_WP_HOST` — staging WordPress REST host.
- `HECMEDIA_STAGING_CLOUDFRONT_DISTRIBUTION_ID` — distribution serving only
  `development.hecmedia.org`.

The workflow uses GitHub OIDC and the role ARN above; it must not receive
static AWS access keys, a static secret key, or an AWS region secret.

Its OIDC trust policy must allow only
`repo:ytadvisors/hecmedia:environment:hecmedia-staging` with audience
`sts.amazonaws.com`. Permissions must be limited to the existing staging
deployment's named S3 assets, Lambda@Edge function and versions, and CloudFront
distribution/invalidation. It must not allow Route 53 changes, SES, billing,
any IAM action, production resource ARNs, or wildcard resources. The CloudFront distribution must list exactly
`development.hecmedia.org` as its alias.

Related work: #68041, #68042, #68043, #68044, #68045, #68046, #68047, #68048,
#68049, #68050, #68051. Staging directive: `phase0-D3-access-and-preview.md`.
