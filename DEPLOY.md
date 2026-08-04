# Deploy & Rollback

> **NEXT 12 DEPLOYMENT BOUNDARY — GOVERNED STAGING ONLY**
>
> The `upgrade/next16` compatibility checkpoint upgrades the application runtime to
> Next.js 12, but this repository still packages Lambda@Edge with the Next-9-era
> `@sls-next/serverless-component@1.19.1-patch.1` /
> `@sls-next/lambda-at-edge@1.4.1-alpha.2` stack. Do not run `yarn deploy`,
> `serverless`, or any full-stack production deployment from that checkpoint.
>
> The approved staging exception is a `workflow_dispatch` of
> `.github/workflows/staging-deploy.yml` for an exact merged commit and a positive HEC
> Media queue-task receipt. That workflow builds on Node 24, disables staging form
> sends and the unused image optimizer, verifies the expected Lambda package contract,
> refuses extra Lambda bundles, updates only the three existing staging resources,
> waits for CloudFront propagation, and verifies rendered and hydrated routes. The
> deploy script rejects mutation outside that governed workflow before its first AWS
> write. Direct workstation use of `node scripts/staging-deploy.js deploy` is not an
> approved workaround.
>
> Production remains blocked except for the isolated, reviewed newsletter release in
> `scripts/newsletter-production-deploy.js`; it exports two static pages and updates
> three owned CloudFront behaviors without modifying the legacy default Lambda@Edge
> association. A green `yarn build` or `yarn test` alone is not permission to ship.

## Legacy full-stack deployment (blocked)

This site deploys via the **Serverless Components** framework (`serverless.yml` uses the
`@sls-next/serverless-component@1.19.1-patch.1` component, not the classic Serverless Framework
CloudFormation stack). Its historical deploy command is:

```shell
yarn deploy   # BLOCKED at the Next 12 checkpoint
```

This builds the Next.js app and pushes Lambda@Edge functions + a CloudFront distribution + S3
static assets, driven by env vars `APOLLO_CLIENT_URI`, `SUBDOMAIN`, `DOMAIN` (see `serverless.yml`).
It is not approved while the checkpoint above remains active. Staging publishes use only the
governed workflow exception; production uses only the isolated newsletter release exception.

**Important distinction:** Serverless Components does not use CloudFormation stacks. There is
**no `serverless rollback -t <timestamp>` command** for `@sls-next` deployments — that command only
exists for the classic (v1/v2) Serverless Framework, which this repo does not use. Any rollback
here means **redeploying an older commit**, not reverting a stack.

## Governed staging publish and rollback

Dispatch `.github/workflows/staging-deploy.yml` from an approved publisher. A deploy requires
`action=deploy`, the exact merged commit SHA in `ref`, and the positive HEC Media queue task ID
that records the staging authorization. The workflow records deploy evidence and moves
`staging-last-known-good` only after verification succeeds.

Rollback uses the same workflow with `action=rollback` and a positive authorization task ID.
The workflow ignores `ref`, deploys `staging-last-known-good`, and runs the same verification
before recording a new outcome. Do not move the tag or invoke the deploy script directly.

## Legacy full-stack rollback (blocked)

The historical full-stack rollback was a redeploy of an older commit. It remains blocked by the
Next 12 boundary and is documented only for recovery planning:

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
