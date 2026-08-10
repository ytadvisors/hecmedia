#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPOSITORY = "ytadvisors/hecmedia";
const STATE_SCHEMA = "hecmedia-production-release-tag-v1";
const REPO_ROOT = path.join(__dirname, "..");
const RELEASE_DIR = path.join(REPO_ROOT, ".production-release");
const STATE_PATH = path.join(RELEASE_DIR, "tag-state-before.json");
const CREATED_PATH = path.join(RELEASE_DIR, "tag-created-by-run.json");

function assertReleaseSha(releaseSha) {
  if (!/^[0-9a-f]{40}$/.test(releaseSha || "")) {
    throw new Error("Release tag requires an exact 40-character SHA.");
  }
  return releaseSha;
}

function releaseTag(releaseSha) {
  return `hecmedia-production-${assertReleaseSha(releaseSha).slice(0, 12)}`;
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value || ""));
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

function createGhAdapter(options = {}) {
  const { repository = REPOSITORY } = options;
  if (repository !== REPOSITORY) {
    throw new Error(`Release tags are restricted to ${REPOSITORY}.`);
  }
  function request(args, requestOptions = {}) {
    const result = spawnSync("gh", ["api", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      input: requestOptions.input
        ? `${JSON.stringify(requestOptions.input)}\n`
        : undefined,
      timeout: 30000
    });
    if (result.status !== 0) {
      const detail = `${result.stdout || ""}\n${result.stderr || ""}`;
      if (
        requestOptions.allowNotFound &&
        /\bHTTP 404\b|Not Found/i.test(detail)
      ) {
        return null;
      }
      throw new Error(`GitHub tag API failed: ${detail.trim().slice(0, 1000)}`);
    }
    return requestOptions.parse === false
      ? result.stdout
      : parseJson(result.stdout, "GitHub tag API");
  }
  return {
    createRef(tag, tagObject) {
      return request(
        ["--method", "POST", `repos/${repository}/git/refs`, "--input", "-"],
        { input: { ref: `refs/tags/${tag}`, sha: tagObject } }
      );
    },
    createTagObject(tag, releaseSha, message) {
      return request(
        ["--method", "POST", `repos/${repository}/git/tags`, "--input", "-"],
        { input: { message, object: releaseSha, tag, type: "commit" } }
      );
    },
    deleteRef(tag) {
      return request(
        ["--method", "DELETE", `repos/${repository}/git/refs/tags/${tag}`],
        { parse: false }
      );
    },
    getRef(tag) {
      return request([`repos/${repository}/git/ref/tags/${tag}`], {
        allowNotFound: true
      });
    },
    getTagObject(tagObject) {
      return request([`repos/${repository}/git/tags/${tagObject}`]);
    }
  };
}

function assertAnnotatedTag(ref, annotated, expected) {
  if (
    !/^[0-9a-f]{40}$/.test(expected.tagObject || "") ||
    !ref ||
    !ref.object ||
    ref.object.type !== "tag" ||
    ref.object.sha !== expected.tagObject ||
    !annotated ||
    annotated.sha !== expected.tagObject ||
    annotated.tag !== expected.tag ||
    !annotated.object ||
    annotated.object.type !== "commit" ||
    annotated.object.sha !== expected.releaseSha
  ) {
    throw new Error(
      `Release tag ${expected.tag} does not resolve through the expected annotated object to ${expected.releaseSha}.`
    );
  }
  return {
    releaseSha: expected.releaseSha,
    tag: expected.tag,
    tagObject: expected.tagObject
  };
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`${label} is missing or unsafe.`);
  }
  return parseJson(fs.readFileSync(filePath, "utf8"), label);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx"
  });
}

function assertState(state, releaseSha) {
  const tag = releaseTag(releaseSha);
  if (
    !state ||
    state.schema !== STATE_SCHEMA ||
    state.releaseSha !== releaseSha ||
    state.tag !== tag ||
    !["absent", "preexisting"].includes(state.state)
  ) {
    throw new Error("Release-tag preflight state is invalid or stale.");
  }
  return state;
}

function preflight(options = {}) {
  const {
    adapter = createGhAdapter(options),
    releaseSha = process.env.RELEASE_SHA,
    statePath = STATE_PATH
  } = options;
  assertReleaseSha(releaseSha);
  const tag = releaseTag(releaseSha);
  const ref = adapter.getRef(tag);
  let state;
  if (!ref) {
    state = {
      checkedAt: new Date().toISOString(),
      releaseSha,
      schema: STATE_SCHEMA,
      state: "absent",
      tag
    };
  } else {
    if (!ref.object || ref.object.type !== "tag" || !ref.object.sha) {
      throw new Error(`Existing release tag ${tag} is not annotated.`);
    }
    const annotated = adapter.getTagObject(ref.object.sha);
    assertAnnotatedTag(ref, annotated, {
      releaseSha,
      tag,
      tagObject: ref.object.sha
    });
    state = {
      checkedAt: new Date().toISOString(),
      releaseSha,
      schema: STATE_SCHEMA,
      state: "preexisting",
      tag,
      tagObject: ref.object.sha
    };
  }
  writeJson(statePath, state);
  return state;
}

function create(options = {}) {
  const {
    adapter = createGhAdapter(options),
    createdPath = CREATED_PATH,
    releaseSha = process.env.RELEASE_SHA,
    runAttempt = process.env.GITHUB_RUN_ATTEMPT,
    runId = process.env.GITHUB_RUN_ID,
    statePath = STATE_PATH
  } = options;
  assertReleaseSha(releaseSha);
  const state = assertState(
    readJson(statePath, "Release-tag preflight state"),
    releaseSha
  );
  if (state.state === "preexisting") {
    const ref = adapter.getRef(state.tag);
    if (!ref || !ref.object || ref.object.type !== "tag") {
      throw new Error(`Preexisting release tag ${state.tag} drifted.`);
    }
    return {
      state: "preexisting",
      ...assertAnnotatedTag(ref, adapter.getTagObject(ref.object.sha), {
        releaseSha,
        tag: state.tag,
        tagObject: state.tagObject
      })
    };
  }
  if (
    !/^[1-9][0-9]*$/.test(runId || "") ||
    !/^[1-9][0-9]*$/.test(runAttempt || "")
  ) {
    throw new Error(
      "Release-tag creation requires the exact workflow run and attempt."
    );
  }
  const message = `HEC Media production frontend ${releaseSha} (run ${runId}, attempt ${runAttempt})`;
  const annotated = adapter.createTagObject(state.tag, releaseSha, message);
  const tagObject = annotated && annotated.sha;
  assertAnnotatedTag({ object: { sha: tagObject, type: "tag" } }, annotated, {
    releaseSha,
    tag: state.tag,
    tagObject
  });
  const created = {
    createdAt: new Date().toISOString(),
    message,
    releaseSha,
    runAttempt,
    runId,
    schema: STATE_SCHEMA,
    tag: state.tag,
    tagObject
  };
  // Persist the exact immutable object before the ref mutation. Recovery may
  // delete only a ref that still points to this run-created object.
  writeJson(createdPath, created);
  const ref = adapter.createRef(state.tag, tagObject);
  return {
    state: "created",
    ...assertAnnotatedTag(ref, annotated, {
      releaseSha,
      tag: state.tag,
      tagObject
    })
  };
}

function cleanup(options = {}) {
  const {
    adapter = createGhAdapter(options),
    createdPath = CREATED_PATH,
    releaseSha = process.env.RELEASE_SHA,
    runAttempt = process.env.GITHUB_RUN_ATTEMPT,
    runId = process.env.GITHUB_RUN_ID,
    statePath = STATE_PATH
  } = options;
  assertReleaseSha(releaseSha);
  const state = assertState(
    readJson(statePath, "Release-tag preflight state"),
    releaseSha
  );
  if (state.state === "preexisting" || !fs.existsSync(createdPath)) {
    return { state: "not-created-by-this-run", tag: state.tag };
  }
  const created = readJson(createdPath, "Run-created release-tag marker");
  if (
    created.schema !== STATE_SCHEMA ||
    created.releaseSha !== releaseSha ||
    created.tag !== state.tag ||
    created.runId !== runId ||
    created.runAttempt !== runAttempt ||
    !/^[0-9a-f]{40}$/.test(created.tagObject || "")
  ) {
    throw new Error("Run-created release-tag marker is invalid or stale.");
  }
  const ref = adapter.getRef(state.tag);
  if (!ref) return { state: "already-absent", tag: state.tag };
  const verified = assertAnnotatedTag(
    ref,
    adapter.getTagObject(ref.object && ref.object.sha),
    created
  );
  adapter.deleteRef(state.tag);
  return { state: "removed-run-created-tag", ...verified };
}

if (require.main === module) {
  try {
    const command = process.argv[2];
    let result;
    if (command === "preflight") result = preflight();
    else if (command === "create") result = create();
    else if (command === "cleanup") result = cleanup();
    else throw new Error("Use preflight, create, or cleanup.");
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = {
  CREATED_PATH,
  STATE_PATH,
  STATE_SCHEMA,
  assertAnnotatedTag,
  cleanup,
  create,
  preflight,
  releaseTag
};
