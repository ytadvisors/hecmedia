const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  cleanup,
  create,
  preflight,
  releaseTag
} = require("./production-release-tag");

const releaseSha = "a".repeat(40);
const tag = releaseTag(releaseSha);
const runId = "31360000000";
const runAttempt = "2";
let temporaryDirectory;

beforeEach(() => {
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "hec-tag-"));
});

afterEach(() => {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
});

function paths() {
  return {
    createdPath: path.join(temporaryDirectory, "created.json"),
    statePath: path.join(temporaryDirectory, "state.json")
  };
}

function annotated(tagObject = "b".repeat(40), target = releaseSha) {
  return {
    object: { sha: target, type: "commit" },
    sha: tagObject,
    tag
  };
}

test("preflights absence, creates an annotated tag, and records its exact object", () => {
  const tagObject = "b".repeat(40);
  const adapter = {
    createRef: jest.fn(() => ({ object: { sha: tagObject, type: "tag" } })),
    createTagObject: jest.fn(() => annotated(tagObject)),
    getRef: jest.fn(() => null),
    getTagObject: jest.fn()
  };
  const filePaths = paths();
  expect(
    preflight({ adapter, releaseSha, statePath: filePaths.statePath })
  ).toMatchObject({ state: "absent", tag });
  expect(
    create({
      adapter,
      ...filePaths,
      releaseSha,
      runAttempt,
      runId
    })
  ).toMatchObject({ state: "created", tag, tagObject });
  expect(adapter.createTagObject).toHaveBeenCalledWith(
    tag,
    releaseSha,
    expect.stringContaining(`run ${runId}, attempt ${runAttempt}`)
  );
  expect(adapter.createRef).toHaveBeenCalledWith(tag, tagObject);
  expect(
    JSON.parse(fs.readFileSync(filePaths.createdPath, "utf8"))
  ).toMatchObject({
    releaseSha,
    runAttempt,
    runId,
    tag,
    tagObject
  });
});

test("accepts only a preexisting annotated tag that peels to the exact release", () => {
  const tagObject = "b".repeat(40);
  const adapter = {
    createRef: jest.fn(),
    createTagObject: jest.fn(),
    getRef: jest.fn(() => ({ object: { sha: tagObject, type: "tag" } })),
    getTagObject: jest.fn(() => annotated(tagObject))
  };
  const filePaths = paths();
  expect(
    preflight({ adapter, releaseSha, statePath: filePaths.statePath })
  ).toMatchObject({ state: "preexisting", tagObject });
  expect(
    create({
      adapter,
      ...filePaths,
      releaseSha,
      runAttempt,
      runId
    })
  ).toMatchObject({ state: "preexisting", tagObject });
  expect(adapter.createTagObject).not.toHaveBeenCalled();
  expect(adapter.createRef).not.toHaveBeenCalled();
});

test("cleanup deletes only the exact immutable tag object created by this run", () => {
  const tagObject = "b".repeat(40);
  const adapter = {
    createRef: jest.fn(() => ({ object: { sha: tagObject, type: "tag" } })),
    createTagObject: jest.fn(() => annotated(tagObject)),
    deleteRef: jest.fn(),
    getRef: jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ object: { sha: tagObject, type: "tag" } }),
    getTagObject: jest.fn(() => annotated(tagObject))
  };
  const filePaths = paths();
  preflight({ adapter, releaseSha, statePath: filePaths.statePath });
  create({
    adapter,
    ...filePaths,
    releaseSha,
    runAttempt,
    runId
  });
  expect(
    cleanup({
      adapter,
      ...filePaths,
      releaseSha,
      runAttempt,
      runId
    })
  ).toMatchObject({ state: "removed-run-created-tag", tagObject });
  expect(adapter.deleteRef).toHaveBeenCalledWith(tag);
});

test("cleanup refuses a concurrent tag object and preserves its ref", () => {
  const createdTagObject = "b".repeat(40);
  const concurrentTagObject = "c".repeat(40);
  const adapter = {
    createRef: jest.fn(() => ({
      object: { sha: createdTagObject, type: "tag" }
    })),
    createTagObject: jest.fn(() => annotated(createdTagObject)),
    deleteRef: jest.fn(),
    getRef: jest
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        object: { sha: concurrentTagObject, type: "tag" }
      }),
    getTagObject: jest.fn(() => annotated(concurrentTagObject))
  };
  const filePaths = paths();
  preflight({ adapter, releaseSha, statePath: filePaths.statePath });
  create({
    adapter,
    ...filePaths,
    releaseSha,
    runAttempt,
    runId
  });
  expect(() =>
    cleanup({
      adapter,
      ...filePaths,
      releaseSha,
      runAttempt,
      runId
    })
  ).toThrow("expected annotated object");
  expect(adapter.deleteRef).not.toHaveBeenCalled();
});

test("cleanup never removes a tag that predated this run", () => {
  const tagObject = "b".repeat(40);
  const adapter = {
    deleteRef: jest.fn(),
    getRef: jest.fn(() => ({ object: { sha: tagObject, type: "tag" } })),
    getTagObject: jest.fn(() => annotated(tagObject))
  };
  const filePaths = paths();
  preflight({ adapter, releaseSha, statePath: filePaths.statePath });
  expect(
    cleanup({
      adapter,
      ...filePaths,
      releaseSha,
      runAttempt,
      runId
    })
  ).toMatchObject({ state: "not-created-by-this-run" });
  expect(adapter.deleteRef).not.toHaveBeenCalled();
});
