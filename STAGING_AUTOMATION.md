# Staging deployment controller — retired

The repository-side controller for publishing the frontend to
`development.hecmedia.org` is retired as part of HEC Media Phase 2. The manual
workflow, its deployment script, and its staging verifier have been removed so
this repository cannot recreate or update that staging surface.

This code change does not delete or disable cloud resources. The staging
CloudFront distribution, Lambda@Edge function, S3 bucket, IAM role, Route 53
record, GitHub environment, and environment secrets remain live until their
separate inventory, approvals, execution, and verification gates are complete.
Do not interpret merging this change as authorization to mutate those resources.

Read-only acceptance and smoke tooling may remain temporarily for observation
and final negative verification. It is not a supported deployment path and must
not be extended to publish, roll back, or recreate staging infrastructure.

Production is unchanged. All production publishing and rollback continues only
through `.github/workflows/production-deploy.yml` and its protected environment.
The legacy full-stack Serverless Components deployment remains blocked.

The controlling plan is
[`ytadvisors/openclaw#1505`](https://github.com/ytadvisors/openclaw/pull/1505).
Repository retirement is a preparation gate in that plan; live teardown still
requires the exact written Yomi and HEC approvals recorded in the shared Phase 2
execution playbook.
