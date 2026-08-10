#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  BUCKET_NAME,
  RECOVERY_CONTROLLER_SCHEMA,
  SANITIZED_ROLLBACK_ARN,
  SANITIZED_ROLLBACK_CODE_SHA256,
  applySanitizedRollback,
  assertDistributionContract,
  assertGovernedDeployContext,
  createS3RecoveryAdapter,
  verifySanitizedRollbackVersion
} = require("./production-deploy");
const { inspect: inspectReleaseTag } = require("./production-release-tag");
const {
  loadBoundManifest,
  sha256File,
  validateManifest
} = require("./production-s3-recovery");

const REPOSITORY = "ytadvisors/hecmedia";
const REPO_ROOT = path.join(__dirname, "..");
const RELEASE_DIR = path.join(REPO_ROOT, ".production-release");
const WATCHDOG_SCHEMA = "hecmedia-production-recovery-watchdog-ready-v1";
const JOBS = {
  mutation: "Apply AWS candidate or governed rollback",
  publicVerification: "Verify public candidate without cloud credentials",
  releaseTag: "Record terminal release tag"
};
const TERMINAL_FAILURES = new Set([
  "action_required",
  "cancelled",
  "failure",
  "neutral",
  "skipped",
  "stale",
  "startup_failure",
  "timed_out"
]);

function assertPositive(value, label) {
  if (!/^[1-9][0-9]*$/.test(String(value || ""))) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return String(value);
}

function assertSha(value, label) {
  if (!/^[0-9a-f]{40}$/.test(String(value || ""))) {
    throw new Error(`${label} must be an exact commit SHA.`);
  }
  return String(value);
}

function selector(env = process.env) {
  const taskId = assertPositive(
    env.HECMEDIA_PRODUCTION_REQUEST_TASK_ID,
    "Watchdog task ID"
  );
  const runId = assertPositive(env.GITHUB_RUN_ID, "Watchdog run ID");
  const runAttempt = assertPositive(
    env.GITHUB_RUN_ATTEMPT,
    "Watchdog run attempt"
  );
  const releaseSha = assertSha(env.DEPLOY_SHA, "Watchdog release SHA");
  const prefix = `_deployment-evidence/${taskId}/${runId}/${runAttempt}/${releaseSha}`;
  return {
    candidateDistributionKey: `${prefix}/candidate-distribution.json`,
    controllerKey: `${prefix}/recovery-controller.json`,
    fenceKey: `${prefix}/write-fence.json`,
    mutationCompleteKey: `${prefix}/mutation-complete.json`,
    prefix,
    readyKey: `${prefix}/watchdog-ready.json`,
    recoveryResultKey: `${prefix}/watchdog-recovery.json`,
    releaseSha,
    runAttempt,
    runId,
    taskId
  };
}

function writeLocalJson(name, value) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const target = path.join(RELEASE_DIR, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
}

function readBoundJson(s3, key, name) {
  const head = s3.head(key);
  if (!head) return null;
  const target = path.join(RELEASE_DIR, name);
  s3.getFile(key, target);
  const actualSha256 = sha256File(target);
  const expectedSha256 =
    head.Metadata && (head.Metadata.evidence_sha256 || head.Metadata.sha256);
  if (!expectedSha256 || expectedSha256 !== actualSha256) {
    throw new Error(`${name} S3 metadata/checksum binding is invalid.`);
  }
  return {
    head,
    sha256: actualSha256,
    value: JSON.parse(fs.readFileSync(target, "utf8"))
  };
}

function putBoundJson(s3, key, name, value, selected) {
  const target = writeLocalJson(name, value);
  const sha256 = sha256File(target);
  s3.putFile(
    key,
    target,
    {
      evidence_sha256: sha256,
      evidence_type: name.replace(/\.json$/, ""),
      release_sha: selected.releaseSha,
      run_attempt: selected.runAttempt,
      run_id: selected.runId,
      task_id: selected.taskId
    },
    { destinationIfNoneMatch: "*" }
  );
  const uploaded = readBoundJson(s3, key, `${name}.uploaded`);
  if (!uploaded || uploaded.sha256 !== sha256) {
    throw new Error(`${name} did not persist immutably.`);
  }
  return { key, sha256, value };
}

function validateController(record, selected, env = process.env) {
  const controller = record && record.value;
  if (
    !controller ||
    controller.schema !== RECOVERY_CONTROLLER_SCHEMA ||
    controller.bucket !== BUCKET_NAME ||
    controller.sanitizedRollbackArn !== SANITIZED_ROLLBACK_ARN ||
    controller.sanitizedRollbackCodeSha256 !== SANITIZED_ROLLBACK_CODE_SHA256 ||
    !controller.binding ||
    String(controller.binding.taskId) !== selected.taskId ||
    String(controller.binding.runId) !== selected.runId ||
    String(controller.binding.runAttempt) !== selected.runAttempt ||
    controller.binding.releaseSha !== selected.releaseSha ||
    controller.binding.baselineEtag !== env.EXPECTED_CLOUDFRONT_ETAG ||
    controller.baselineDefaultLambdaArn !== SANITIZED_ROLLBACK_ARN ||
    controller.baselineDefaultLambdaCodeSha256 !==
      SANITIZED_ROLLBACK_CODE_SHA256 ||
    controller.baselineApiLambdaArn !== "none" ||
    !controller.baselineDistribution ||
    controller.baselineDistribution.ETag !== controller.binding.baselineEtag ||
    !controller.baselineHomepage ||
    controller.baselineHomepage.releaseSha !==
      controller.binding.baselineReleaseSha ||
    !/^[0-9a-f]{64}$/.test(controller.manifestSha256 || "")
  ) {
    throw new Error(
      "Recovery controller is stale or outside the approved release."
    );
  }
  assertDistributionContract(
    controller.baselineDistribution.DistributionConfig,
    SANITIZED_ROLLBACK_ARN,
    "none"
  );
  const expectedManifestKey = `${selected.prefix}/s3-preimage-manifest.json`;
  if (controller.manifestKey !== expectedManifestKey) {
    throw new Error("Recovery controller manifest selector is invalid.");
  }
  return controller;
}

async function waitForController(s3, selected, options = {}) {
  const deadline = Date.now() + (options.timeoutMs || 20 * 60 * 1000);
  const pause =
    options.pause ||
    (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  async function poll() {
    if (Date.now() >= deadline) return null;
    const record = readBoundJson(
      s3,
      selected.controllerKey,
      "watchdog-controller.json"
    );
    if (record) return record;
    await pause(options.pollMs || 5000);
    return poll();
  }
  return poll();
}

function jobByName(jobs, name) {
  return jobs.find(job => job.name === name) || null;
}

function classifyJobs(jobs) {
  const mutation = jobByName(jobs, JOBS.mutation);
  if (!mutation || mutation.status !== "completed") {
    return { phase: "mutation", state: "wait" };
  }
  if (mutation.conclusion !== "success") {
    return {
      conclusion: mutation.conclusion,
      phase: "mutation",
      state: "recover"
    };
  }
  const publicVerification = jobByName(jobs, JOBS.publicVerification);
  if (!publicVerification || publicVerification.status !== "completed") {
    return { phase: "public-verification", state: "wait" };
  }
  if (publicVerification.conclusion !== "success") {
    return {
      conclusion: publicVerification.conclusion,
      phase: "public-verification",
      state: "recover"
    };
  }
  const releaseTag = jobByName(jobs, JOBS.releaseTag);
  if (!releaseTag || releaseTag.status !== "completed") {
    return { phase: "release-tag", state: "wait" };
  }
  if (releaseTag.conclusion === "success") {
    return { phase: "release-tag", state: "inspect-tag" };
  }
  if (TERMINAL_FAILURES.has(releaseTag.conclusion)) {
    return {
      conclusion: releaseTag.conclusion,
      phase: "release-tag",
      state: "inspect-tag-or-recover"
    };
  }
  return { phase: "release-tag", state: "wait" };
}

async function executeDecision(decision, options) {
  const { inspectTag, recover, releaseSha } = options;
  if (!decision || decision.state === "wait") return null;
  const next = { ...decision };
  if (next.state === "inspect-tag" || next.state === "inspect-tag-or-recover") {
    try {
      const tag = await inspectTag();
      if (
        tag.state === "exact-annotated-release" &&
        next.state === "inspect-tag"
      ) {
        return {
          releaseSha,
          state: "terminal-tag-and-public-verification-succeeded",
          tag
        };
      }
      if (tag.state === "exact-annotated-release") {
        next.exactTagPreserved = tag;
      }
    } catch (error) {
      next.tagInspectionError = error.message || String(error);
    }
    next.state = "recover";
    if (!next.conclusion) {
      next.conclusion = "success-with-invalid-terminal-tag";
    }
  }
  if (next.state === "recover") return recover(next);
  return null;
}

async function listJobs(selected, token = process.env.GH_TOKEN) {
  if (!token)
    throw new Error("Recovery watchdog requires actions:read GH_TOKEN.");
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/actions/runs/${selected.runId}/attempts/${selected.runAttempt}/jobs?per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "hecmedia-production-recovery-watchdog",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }
  );
  if (!response.ok) {
    throw new Error(`GitHub jobs API returned HTTP ${response.status}.`);
  }
  const body = await response.json();
  if (!Array.isArray(body.jobs)) {
    throw new Error("GitHub jobs API omitted the jobs array.");
  }
  return body.jobs;
}

function loadManifest(s3, controller, selected) {
  const localPath = path.join(RELEASE_DIR, "watchdog-s3-manifest.json");
  return loadBoundManifest({
    expectedBaselineEtag: controller.binding.baselineEtag,
    expectedBaselineReleaseSha: controller.binding.baselineReleaseSha,
    expectedBucket: BUCKET_NAME,
    expectedManifestSha256: controller.manifestSha256,
    expectedReleaseSha: selected.releaseSha,
    expectedRunId: selected.runId,
    expectedRunAttempt: selected.runAttempt,
    expectedTaskId: selected.taskId,
    localPath,
    manifestKey: controller.manifestKey,
    s3
  });
}

function loadCandidateDistribution(s3, selected) {
  const record = readBoundJson(
    s3,
    selected.candidateDistributionKey,
    "watchdog-candidate-distribution.json"
  );
  if (!record) return null;
  const candidate = record.value;
  if (
    candidate.schema !== "hecmedia-production-candidate-distribution-v1" ||
    candidate.releaseSha !== selected.releaseSha ||
    String(candidate.runId) !== selected.runId ||
    String(candidate.runAttempt) !== selected.runAttempt ||
    String(candidate.taskId) !== selected.taskId ||
    !candidate.config
  ) {
    throw new Error("Candidate CloudFront recovery evidence is invalid.");
  }
  return candidate.config;
}

function recoverFromController(s3, selected, controller, reason) {
  const existing = readBoundJson(
    s3,
    selected.recoveryResultKey,
    "watchdog-existing-recovery.json"
  );
  if (existing) return existing.value;
  if (!s3.head(selected.fenceKey)) {
    return putBoundJson(
      s3,
      selected.recoveryResultKey,
      "watchdog-recovery.json",
      {
        completedAt: new Date().toISOString(),
        reason,
        releaseSha: selected.releaseSha,
        schema: "hecmedia-production-watchdog-result-v1",
        state: "no-production-write-fence"
      },
      selected
    ).value;
  }
  verifySanitizedRollbackVersion();
  const manifest = validateManifest(loadManifest(s3, controller, selected), {
    baselineEtag: controller.binding.baselineEtag,
    baselineReleaseSha: controller.binding.baselineReleaseSha,
    bucket: BUCKET_NAME,
    releaseSha: selected.releaseSha,
    runAttempt: selected.runAttempt,
    runId: selected.runId,
    taskId: selected.taskId
  });
  const candidateDistributionConfig = loadCandidateDistribution(s3, selected);
  let state = {
    baseline_cloudfront_etag: controller.binding.baselineEtag,
    baseline_homepage: controller.baselineHomepage,
    emergency_recovery_reason: reason,
    github_run_attempt: selected.runAttempt,
    github_run_id: selected.runId,
    outcome: "watchdog_recovery",
    release_sha: selected.releaseSha,
    request_task_id: selected.taskId,
    s3_preimage_manifest_key: controller.manifestKey,
    s3_preimage_manifest_sha256: controller.manifestSha256
  };
  state = applySanitizedRollback(state, {
    baselineDistribution: controller.baselineDistribution,
    baselineReleaseSha: controller.binding.baselineReleaseSha,
    candidateDistributionConfig,
    restoreDistribution: true,
    s3,
    s3Manifest: manifest
  });
  const result = {
    completedAt: new Date().toISOString(),
    reason,
    releaseSha: selected.releaseSha,
    rollbackOutcome: state.rollback_outcome,
    schema: "hecmedia-production-watchdog-result-v1",
    state: "recovered"
  };
  putBoundJson(
    s3,
    selected.recoveryResultKey,
    "watchdog-recovery.json",
    result,
    selected
  );
  return result;
}

async function runWatchdog(options = {}) {
  const env = options.env || process.env;
  assertGovernedDeployContext(env, "deploy");
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const selected = selector(env);
  const s3 = options.s3 || createS3RecoveryAdapter();
  const controllerRecord = await waitForController(s3, selected, options);
  if (!controllerRecord) {
    return {
      releaseSha: selected.releaseSha,
      state: "no-controller-before-timeout"
    };
  }
  const controller = validateController(controllerRecord, selected, env);
  loadManifest(s3, controller, selected);
  putBoundJson(
    s3,
    selected.readyKey,
    "watchdog-ready.json",
    {
      armedAt: new Date().toISOString(),
      controllerSha256: controllerRecord.sha256,
      jobId: env.GITHUB_JOB || "recovery-watchdog",
      releaseSha: selected.releaseSha,
      runAttempt: selected.runAttempt,
      runId: selected.runId,
      schema: WATCHDOG_SCHEMA,
      taskId: selected.taskId
    },
    selected
  );
  const getJobs = options.listJobs || (() => listJobs(selected, env.GH_TOKEN));
  const inspectTag =
    options.inspectTag ||
    (() => inspectReleaseTag({ releaseSha: selected.releaseSha }));
  const pause =
    options.pause ||
    (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
  const deadline = Date.now() + (options.monitorTimeoutMs || 90 * 60 * 1000);
  async function monitor(apiFailures) {
    if (Date.now() >= deadline) {
      return recoverFromController(s3, selected, controller, {
        conclusion: "watchdog-deadline",
        phase: "workflow",
        state: "recover"
      });
    }
    let decision;
    let nextApiFailures = apiFailures;
    try {
      decision = classifyJobs(await getJobs());
      nextApiFailures = 0;
    } catch (error) {
      nextApiFailures += 1;
      if (nextApiFailures >= 30) {
        return recoverFromController(
          s3,
          selected,
          controller,
          `GitHub job-state API unavailable: ${error.message || error}`
        );
      }
      await pause(options.pollMs || 10000);
      return monitor(nextApiFailures);
    }
    if (decision.state === "wait") {
      await pause(options.pollMs || 10000);
      return monitor(nextApiFailures);
    }
    const executed = await executeDecision(decision, {
      inspectTag,
      recover: reason =>
        recoverFromController(s3, selected, controller, reason),
      releaseSha: selected.releaseSha
    });
    if (executed) return executed;
    await pause(options.pollMs || 10000);
    return monitor(nextApiFailures);
  }
  return monitor(0);
}

if (require.main === module) {
  runWatchdog()
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => {
      console.error(error && error.stack ? error.stack : error);
      process.exitCode = 1;
    });
}

module.exports = {
  JOBS,
  WATCHDOG_SCHEMA,
  classifyJobs,
  executeDecision,
  recoverFromController,
  runWatchdog,
  selector,
  validateController
};
