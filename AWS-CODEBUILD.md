# HECMedia AWS-native CI and staging release

GitHub Actions does not build or deploy HECMedia. AWS CodeBuild owns CI and the
manually authorized staging release. Production is not changed by this path.

## Projects

- `hecmedia-ci`: lint, Jest coverage, and optional read-only API contracts.
- `hecmedia-staging`: exact-SHA build, staging-only deployment, verification, and evidence.

Both projects use the existing GitHub repository as source. The CI project may use
a GitHub webhook after a successful manual validation; this consumes AWS CodeBuild,
not GitHub-hosted runner minutes. The staging project has no webhook.

## Required AWS configuration

Create one Secrets Manager JSON secret named `hecmedia/staging` with:

- `apollo_client_uri`
- `wp_host`
- `cloudfront_distribution_id`
- `recaptcha_site_key`
- `topbar_ctas_json`

Set `HECMEDIA_CODEBUILD_SERVICE_ROLE_ARN` to a role that can read that secret,
write CodeBuild logs/artifacts, and perform only the existing staging Lambda,
S3, and CloudFront updates. Then run:

```bash
node scripts/setup-codebuild.js
aws codebuild start-build --project-name hecmedia-ci --source-version master
```

Only after the first CI build succeeds should an administrator create the
`hecmedia-ci` GitHub webhook for `PULL_REQUEST_CREATED`,
`PULL_REQUEST_UPDATED`, and pushes to `master`/`develop`.

## Staging release

Merge and verify the intended revision, then invoke the exact SHA:

```bash
HECMEDIA_RELEASE_AUTHORIZED_BY=ytwguru \
  node scripts/staging-release-codebuild.js <40-character-merged-sha>
```

The build deploys only `https://development.hecmedia.org`. It never targets
HECMedia production. Rollback remains an explicit exact-SHA staging build using
the prior verified SHA from the CodeBuild evidence artifact.
