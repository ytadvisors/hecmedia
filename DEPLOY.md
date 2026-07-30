# Deploy & Rollback

> **NEXT 12 CHECKPOINT — DO NOT DEPLOY**
>
> The `upgrade/next16` compatibility checkpoint upgrades the application runtime to
> Next.js 12, but this repository still packages Lambda@Edge with the Next-9-era
> `@sls-next/serverless-component@1.19.1-patch.1` /
> `@sls-next/lambda-at-edge@1.4.1-alpha.2` stack. Do not run `yarn deploy`,
> `staging-deploy`, `serverless`, or any production deployment from that checkpoint.
> Deployment remains blocked until the `@sls-next/*` stack is upgraded for Next 12
> (or replaced), its output contract is verified, and this warning is removed in the
> reviewed deployment-path PR. A green `yarn build` or `yarn test` does not make this
> checkpoint deployable.

## Stack

This site deploys via the **Serverless Components** framework (`serverless.yml` uses the
`@sls-next/serverless-component@1.19.1-patch.1` component, not the classic Serverless Framework
CloudFormation stack). Deploy is:

```shell
yarn deploy   # = yarn install && serverless
```

This builds the Next.js app and pushes Lambda@Edge functions + a CloudFront distribution + S3
static assets, driven by env vars `APOLLO_CLIENT_URI`, `SUBDOMAIN`, `DOMAIN` (see `serverless.yml`).
Credentials are human-gated. The CI preview job skips deployment unless a human has configured
the deploy secrets and Yomi has approved that deployment.

**Important distinction:** Serverless Components does not use CloudFormation stacks. There is
**no `serverless rollback -t <timestamp>` command** for `@sls-next` deployments — that command only
exists for the classic (v1/v2) Serverless Framework, which this repo does not use. Any rollback
here means **redeploying an older commit**, not reverting a stack.

## Rollback: redeploy an older commit

Because there's no native rollback command, "rolling back" is just running the normal deploy
against the last known-good commit:

1. Identify the last known-good ref — prefer a tagged release (see convention below) over a raw
   SHA, so there's no ambiguity about what "good" means.
   ```shell
   git tag --sort=-creatordate | head -5
   ```
2. Check it out on a clean tree (don't do this on top of uncommitted changes):
   ```shell
   git fetch origin --tags
   git checkout <tag-or-sha>
   ```
3. Redeploy from that commit:
   ```shell
   yarn install
   yarn deploy
   ```
4. Smoke-test the deployed domain before declaring the rollback complete. Use the same
   `SUBDOMAIN` and `DOMAIN` values supplied to the deploy, and verify both the home page and a
   known dynamic route return successful HTTP responses after CloudFront propagation:
   ```shell
   SITE_URL="https://${SUBDOMAIN}.${DOMAIN}"
   curl --fail --silent --show-error --location --retry 12 --retry-all-errors \
     --retry-delay 10 --output /dev/null "$SITE_URL/"
   curl --fail --silent --show-error --location --retry 12 --retry-all-errors \
     --retry-delay 10 --output /dev/null "$SITE_URL/events"
   ```
5. Return to `master` locally once the rollback is confirmed live — the checkout in step 2 only
   affects your local working tree, not what's deployed, until step 3 runs.

**Caveats:**

- This redeploys forward to an old commit's code — it does not undo any data/schema changes (there
  are none in this stack; the site has no server-side DB writes) and does not instantly evict
  CloudFront's edge cache. Expect a few minutes for the new Lambda@Edge version to propagate.
- If the bad deploy changed env vars/domain config in `serverless.yml` itself, make sure those are
  also reverted before redeploying — the "older commit" needs to include the older config, not just
  older application code.

## Tagged-release convention (new — adopt before Phase 4 / any production deploy)

Tag every production deploy at the commit that was actually deployed, immediately after a
successful `yarn deploy` + smoke test:

```shell
git tag -a deploy-$(date +%Y-%m-%d)-<short-desc> -m "Production deploy: <short-desc>"
git push origin --tags
```

Example: `deploy-2026-07-12-nav-restructure`. Use a dated, descriptive tag rather than semver —
this is a single client site, not a versioned package, so "what was live on what date" is the
useful lookup, not a version number.

This repo currently has **zero tags**. Start the convention at the next production deploy (Phase 4,
gated behind #57952/#57953/#57954 per the Phase 2 rescope plan) so the rollback procedure above
always has a same-command target (`git checkout <tag>`) instead of hunting through `git log` for
the right SHA.
