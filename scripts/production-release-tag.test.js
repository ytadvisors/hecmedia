const {
  TAGGER_EMAIL,
  TAGGER_NAME,
  inspectRemoteTag,
  parseRemoteTagState,
  recordReleaseTag,
  releaseTag,
  tagMessage
} = require("./production-release-tag");

const releaseSha = "a".repeat(40);
const tagObject = "b".repeat(40);
const tag = releaseTag(releaseSha);

function remoteState(target = releaseSha) {
  return [
    `${tagObject}\trefs/tags/${tag}`,
    `${target}\trefs/tags/${tag}^{}`,
    ""
  ].join("\n");
}

function annotatedObject(options = {}) {
  const name = options.name || TAGGER_NAME;
  const email = options.email || TAGGER_EMAIL;
  const target = options.target || releaseSha;
  return [
    `object ${target}`,
    "type commit",
    `tag ${tag}`,
    `tagger ${name} <${email}> 1786356000 +0000`,
    "",
    tagMessage(target),
    ""
  ].join("\n");
}

function result(stdout = "", status = 0, stderr = "") {
  return { status, stderr, stdout };
}

test("release tag creation uses deterministic identity and verifies the exact remote annotation", () => {
  let remoteReads = 0;
  const calls = [];
  const adapter = {
    run(args) {
      calls.push(args);
      if (args[0] === "ls-remote") {
        remoteReads += 1;
        return result(remoteReads === 1 ? "" : remoteState());
      }
      if (args[0] === "fetch") return result();
      if (args[0] === "cat-file" && args[1] === "-t") {
        return result("tag\n");
      }
      if (args[0] === "cat-file" && args[1] === "-p") {
        return result(annotatedObject());
      }
      if (args.includes("tag") || args[0] === "push") return result();
      throw new Error(`Unexpected git call: ${args.join(" ")}`);
    }
  };

  expect(recordReleaseTag({ adapter, releaseSha })).toMatchObject({
    outcome: "created",
    releaseSha,
    state: "exact",
    tag,
    tagObject
  });
  expect(calls).toContainEqual([
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
  expect(calls).toContainEqual(["push", "origin", `refs/tags/${tag}`]);
});

test("an existing exact annotated tag is idempotent and never recreated", () => {
  const calls = [];
  const adapter = {
    run(args) {
      calls.push(args);
      if (args[0] === "ls-remote") return result(remoteState());
      if (args[0] === "fetch") return result();
      if (args[0] === "cat-file" && args[1] === "-t") {
        return result("tag\n");
      }
      if (args[0] === "cat-file" && args[1] === "-p") {
        return result(annotatedObject());
      }
      throw new Error(`Unexpected git call: ${args.join(" ")}`);
    }
  };

  expect(recordReleaseTag({ adapter, releaseSha })).toMatchObject({
    outcome: "already-exact",
    releaseSha,
    state: "exact"
  });
  expect(calls.some(args => args.includes("tag") && args.includes("-a"))).toBe(
    false
  );
  expect(calls.some(args => args[0] === "push")).toBe(false);
});

test("tag creation fails closed when push does not make the remote tag visible", () => {
  const adapter = {
    run(args) {
      if (args[0] === "ls-remote") return result();
      if (args.includes("tag")) return result();
      if (args[0] === "push") return result("", 1, "permission denied");
      throw new Error(`Unexpected git call: ${args.join(" ")}`);
    }
  };
  expect(() => recordReleaseTag({ adapter, releaseSha })).toThrow(
    "was not visible after push (status=1): permission denied"
  );
});

test("remote tag verification rejects lightweight, wrong-target, and wrong-identity tags", () => {
  expect(() =>
    parseRemoteTagState(`${releaseSha}\trefs/tags/${tag}\n`, tag)
  ).toThrow("not an exact annotated tag");

  const wrongTargetAdapter = {
    run: jest.fn(() => result(remoteState("c".repeat(40))))
  };
  expect(() => inspectRemoteTag(wrongTargetAdapter, releaseSha)).toThrow(
    `not ${releaseSha}`
  );

  const wrongIdentityAdapter = {
    run(args) {
      if (args[0] === "ls-remote") return result(remoteState());
      if (args[0] === "fetch") return result();
      if (args[0] === "cat-file" && args[1] === "-t") {
        return result("tag\n");
      }
      if (args[0] === "cat-file" && args[1] === "-p") {
        return result(
          annotatedObject({
            email: "unknown@example.com",
            name: "Unknown"
          })
        );
      }
      throw new Error(`Unexpected git call: ${args.join(" ")}`);
    }
  };
  expect(() => inspectRemoteTag(wrongIdentityAdapter, releaseSha)).toThrow(
    "automation identity"
  );
});
