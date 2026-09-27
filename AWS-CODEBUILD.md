# HECMedia AWS-native CI

AWS CodeBuild is the proposed replacement for lint, Jest coverage, and optional
read-only API contracts. GitHub Actions retains `lint`, `test`, and `e2e` until
the replacement is live and required. The existing `preview-deploy` check depends
on all three jobs and also enforces staging retirement. Jury checks and the
separately governed production workflow remain unchanged.

Staging publishing was retired on the base branch. This change preserves that
retirement: it creates no staging project or release entrypoint.

## Activation prerequisites

Activation is separate from this source change. Configure
`HECMEDIA_CODEBUILD_SERVICE_ROLE_ARN` with permission to read the existing
`hecmedia/staging` endpoint secret and write CodeBuild logs. CI does not need
Lambda, S3 publishing, or CloudFront mutation permissions. The secret supplies
`apollo_client_uri` and `wp_host` for optional read-only contract tests.

After approval of the AWS configuration, activate in this order:

1. Run `node scripts/setup-codebuild.js` and manually validate `hecmedia-ci`
   against the reviewed merged SHA. The packageManager field pins Yarn 1.22.19;
   Corepack uses that pin after Node 24.4.1 is installed.
2. Before enabling the PR/branch webhook, restrict builds to trusted origin-repo
   events. Project-level Secrets Manager variables must never reach fork PR builds.
   Verify the admission policy rejects fork PRs; a branch-name filter alone is not
   proof of origin. Leave the webhook disabled if this cannot be enforced.
3. Enable the webhook and verify a real origin-repo PR reports `hecmedia-ci` for
   its current SHA. Confirm a failing lint/test build reports failure as well.
4. In the same activation window, update branch protection for master and develop:
   add the observed `hecmedia-ci` status context as required **before** removing
   old required `lint`, `test`, and `e2e` contexts. Verify the exact context shown
   by GitHub and that a failed/missing CodeBuild result blocks merging. Keep
   `preview-deploy` required for the staging-retirement guard.
5. Only after that evidence is recorded, submit a separate follow-up PR removing
   the GHA quality jobs and their `preview-deploy` dependency edges. Until then,
   both systems may run; there must be no interval without a required quality gate.

If activation fails, retain the GHA jobs and requirements. After a completed
cutover, restore those jobs and required contexts before disabling CodeBuild.
This source change does not provision resources, alter branch protection, or
activate a webhook.
