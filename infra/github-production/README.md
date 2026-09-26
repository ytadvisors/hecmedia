# HEC Media production GitHub role

This directory is the reviewed, one-time bootstrap contract for the
`hecmedia-production-deploy` IAM role. The role is assumed only by the GitHub
`production` environment, whose deployment branch is exactly `master` and whose
required reviewer cannot approve their own run.

The inline policy can update only the two existing production Lambda functions,
the one existing CloudFront distribution, and objects/versioning in the one
existing S3 bucket. It cannot create infrastructure, edit IAM or Route 53,
delete S3 objects, or read Secrets Manager.

An AWS administrator applies this after the pull request is merged and records
the command output in the release evidence. Do not run these commands with the
fleet read-only profile or bypass a local mutation gate.

```sh
aws iam create-role \
  --role-name hecmedia-production-deploy \
  --max-session-duration 7200 \
  --assume-role-policy-document file://infra/github-production/trust-policy.json

aws iam put-role-policy \
  --role-name hecmedia-production-deploy \
  --policy-name hecmedia-production-deploy \
  --policy-document file://infra/github-production/permissions-policy.json
```

The protected GitHub environment also requires the public browser key under the
secret name `HECMEDIA_PRODUCTION_RECAPTCHA_SITE_KEY`. The server-side reCAPTCHA
secret remains in the WordPress backend and must never be copied here.
