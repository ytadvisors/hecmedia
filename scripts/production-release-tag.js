#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const TAGGER_NAME = "yt-agent-tom-grok";
const TAGGER_EMAIL = "yt-agent-tom-grok@users.noreply.github.com";

function assertReleaseSha(releaseSha) {
  if (!/^[0-9a-f]{40}$/.test(releaseSha || "")) {
    throw new Error("Release tag requires an exact 40-character SHA.");
  }
  return releaseSha;
}

function releaseTag(releaseSha) {
  return `hecmedia-production-${assertReleaseSha(releaseSha).slice(0, 12)}`;
}

function tagMessage(releaseSha) {
  return `HEC Media production frontend ${assertReleaseSha(releaseSha)}`;
}

function createGitAdapter() {
  return {
    run(args) {
      const result = spawnSync("git", args, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        timeout: 30000
      });
      return {
        status: result.status,
        stderr: result.stderr || "",
        stdout: result.stdout || ""
      };
    }
  };
}

function requireSuccess(result, operation) {
  if (!result || result.status !== 0) {
    const detail = `${(result && result.stdout) || ""}\n${(result &&
      result.stderr) ||
      ""}`
      .trim()
      .slice(0, 1000);
    throw new Error(`${operation} failed${detail ? `: ${detail}` : "."}`);
  }
  return result.stdout;
}

function parseRemoteTagState(output, tag) {
  const refs = new Map();
  String(output || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach(line => {
      const match = line.match(/^([0-9a-f]{40})\t(.+)$/);
      if (!match) {
        throw new Error(`Release tag ${tag} returned malformed remote state.`);
      }
      const [, objectSha, ref] = match;
      if (ref !== `refs/tags/${tag}` && ref !== `refs/tags/${tag}^{}`) {
        throw new Error(`Release tag ${tag} returned an unexpected ref.`);
      }
      if (refs.has(ref)) {
        throw new Error(`Release tag ${tag} returned a duplicate ref.`);
      }
      refs.set(ref, objectSha);
    });

  if (refs.size === 0) return { state: "absent", tag };
  const tagObject = refs.get(`refs/tags/${tag}`);
  const releaseSha = refs.get(`refs/tags/${tag}^{}`);
  if (!tagObject || !releaseSha) {
    throw new Error(
      `Release tag ${tag} exists but is not an exact annotated tag.`
    );
  }
  return { releaseSha, state: "annotated", tag, tagObject };
}

function assertTagObject(body, expected) {
  const text = String(body || "");
  const separator = text.indexOf("\n\n");
  if (separator < 0) {
    throw new Error(`Release tag ${expected.tag} has a malformed tag object.`);
  }
  const headers = text.slice(0, separator).split("\n");
  const message = text.slice(separator + 2).replace(/\n$/, "");
  const expectedTagger = new RegExp(
    `^tagger ${TAGGER_NAME} <${TAGGER_EMAIL.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}> [1-9][0-9]* [+-][0-9]{4}$`
  );
  if (
    headers.length !== 4 ||
    headers[0] !== `object ${expected.releaseSha}` ||
    headers[1] !== "type commit" ||
    headers[2] !== `tag ${expected.tag}` ||
    !expectedTagger.test(headers[3]) ||
    message !== tagMessage(expected.releaseSha)
  ) {
    throw new Error(
      `Release tag ${expected.tag} annotation is not bound to the exact release and automation identity.`
    );
  }
}

function inspectRemoteTag(adapter, releaseSha) {
  const exactSha = assertReleaseSha(releaseSha);
  const tag = releaseTag(exactSha);
  const remote = requireSuccess(
    adapter.run([
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`
    ]),
    `Read remote release tag ${tag}`
  );
  const state = parseRemoteTagState(remote, tag);
  if (state.state === "absent") return state;
  if (state.releaseSha !== exactSha) {
    throw new Error(
      `Release tag ${tag} resolves to ${state.releaseSha}, not ${exactSha}.`
    );
  }
  requireSuccess(
    adapter.run(["fetch", "--no-tags", "origin", `refs/tags/${tag}`]),
    `Fetch remote release tag ${tag}`
  );
  const objectType = requireSuccess(
    adapter.run(["cat-file", "-t", state.tagObject]),
    `Read release tag ${tag} object type`
  ).trim();
  if (objectType !== "tag") {
    throw new Error(
      `Release tag ${tag} does not point to an annotated object.`
    );
  }
  const tagObject = requireSuccess(
    adapter.run(["cat-file", "-p", state.tagObject]),
    `Read release tag ${tag} annotation`
  );
  assertTagObject(tagObject, { releaseSha: exactSha, tag });
  return { ...state, state: "exact" };
}

function recordReleaseTag(options = {}) {
  const releaseSha = assertReleaseSha(
    options.releaseSha || process.env.RELEASE_SHA
  );
  const adapter = options.adapter || createGitAdapter();
  const tag = releaseTag(releaseSha);
  const before = inspectRemoteTag(adapter, releaseSha);
  if (before.state === "exact") {
    return { ...before, outcome: "already-exact" };
  }

  const createResult = adapter.run([
    "-c",
    `user.name=${TAGGER_NAME}`,
    "-c",
    `user.email=${TAGGER_EMAIL}`,
    "tag",
    "-a",
    tag,
    releaseSha,
    "-m",
    tagMessage(releaseSha)
  ]);
  requireSuccess(createResult, `Create annotated release tag ${tag}`);
  const pushResult = adapter.run(["push", "origin", `refs/tags/${tag}`]);

  let after;
  try {
    after = inspectRemoteTag(adapter, releaseSha);
  } catch (error) {
    const pushDetail = `${pushResult.stdout || ""}\n${pushResult.stderr || ""}`
      .trim()
      .slice(0, 1000);
    throw new Error(
      `${error.message} Push status=${pushResult.status}${
        pushDetail ? `: ${pushDetail}` : ""
      }`
    );
  }
  if (after.state !== "exact") {
    const pushDetail = `${pushResult.stdout || ""}\n${pushResult.stderr || ""}`
      .trim()
      .slice(0, 1000);
    throw new Error(
      `Release tag ${tag} was not visible after push (status=${
        pushResult.status
      })${pushDetail ? `: ${pushDetail}` : "."}`
    );
  }
  return {
    ...after,
    outcome:
      pushResult.status === 0 ? "created" : "created-after-ambiguous-push"
  };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(recordReleaseTag()));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

module.exports = {
  TAGGER_EMAIL,
  TAGGER_NAME,
  assertTagObject,
  inspectRemoteTag,
  parseRemoteTagState,
  recordReleaseTag,
  releaseTag,
  tagMessage
};
