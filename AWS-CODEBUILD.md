# HECMedia AWS-native CI

AWS CodeBuild runs lint, Jest coverage, and optional read-only API contracts.
The existing GitHub Actions `preview-deploy` check remains only as a staging
retirement guard for branch-protection compatibility. Jury checks and the
separately governed production workflow remain unchanged.

Staging publishing was retired on the base branch. This change preserves that
retirement: it creates no staging project or release entrypoint.

## Activation prerequisites

Activation is separate from this source change. Configure
`HECMEDIA_CODEBUILD_SERVICE_ROLE_ARN` with permission to read the existing
`hecmedia/staging` endpoint secret and write CodeBuild logs. CI does not need
Lambda, S3 publishing, or CloudFront mutation permissions. The secret supplies
`apollo_client_uri` and `wp_host` for optional read-only contract tests.

After approval of the AWS configuration, run `node scripts/setup-codebuild.js`
and manually validate `hecmedia-ci` against the reviewed merged SHA. Only after
that succeeds should an administrator enable its pull-request and branch webhook.
This conflict resolution does not provision resources or activate a webhook.
