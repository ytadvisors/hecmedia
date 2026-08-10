const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  MANIFEST_SCHEMA,
  assertRemoteBaseline,
  assertUploadedCandidates,
  evidencePrefix,
  isContentAddressedAdditive,
  loadBoundManifest,
  manifestKey,
  preparePreimages,
  restorePreimages,
  uploadCandidates,
  validateManifest
} = require("./production-s3-recovery");

const binding = {
  baselineEtag: "EBASELINE123",
  baselineReleaseSha: "d".repeat(40),
  releaseSha: "a".repeat(40),
  runId: "31360000000",
  runAttempt: "1",
  taskId: "87001"
};

function metadata(body, versionId = "v1") {
  return {
    CacheControl: "public,max-age=60",
    ContentDisposition: "inline",
    ContentEncoding: "gzip",
    ContentLanguage: "en",
    ContentLength: Buffer.byteLength(body),
    ContentType: "application/javascript",
    ETag: `"${Buffer.from(body).toString("hex")}"`,
    Metadata: { source: "baseline" },
    WebsiteRedirectLocation: undefined,
    VersionId: versionId,
    body
  };
}

function fakeS3(initial = {}) {
  const objects = new Map(Object.entries(initial));
  return {
    copy(source, destination, conditions = {}) {
      const value = objects.get(source);
      if (!value) throw new Error(`missing source ${source}`);
      const current = objects.get(destination);
      if (conditions.sourceIfMatch && value.ETag !== conditions.sourceIfMatch) {
        throw new Error("412 source precondition failed");
      }
      if (conditions.destinationIfNoneMatch === "*" && current) {
        throw new Error("412 destination must be absent");
      }
      if (
        conditions.destinationIfMatch &&
        (!current || current.ETag !== conditions.destinationIfMatch)
      ) {
        throw new Error("412 destination precondition failed");
      }
      objects.set(destination, { ...value, VersionId: `copy-${destination}` });
    },
    getFile(key, destination) {
      const value = objects.get(key);
      if (!value) throw new Error(`missing object ${key}`);
      fs.writeFileSync(destination, value.body);
    },
    head(key) {
      return objects.get(key) || null;
    },
    objects,
    putCandidate(key, source, options = {}) {
      const current = objects.get(key);
      if (options.destinationIfNoneMatch === "*" && current) {
        throw new Error("412 candidate destination must be absent");
      }
      if (
        options.destinationIfMatch &&
        (!current || current.ETag !== options.destinationIfMatch)
      ) {
        throw new Error("412 candidate destination changed");
      }
      const body = fs.readFileSync(source, "utf8");
      const uploaded = {
        ...metadata(body, `candidate-${key}`),
        ContentType: options.contentType,
        Metadata: {}
      };
      objects.set(key, uploaded);
      return { ETag: uploaded.ETag, VersionId: uploaded.VersionId };
    },
    putFile(key, source, customMetadata, conditions = {}) {
      if (conditions.destinationIfNoneMatch === "*" && objects.has(key)) {
        throw new Error("412 manifest destination must be absent");
      }
      const body = fs.readFileSync(source, "utf8");
      objects.set(key, {
        ...metadata(body, `manifest-${key}`),
        ContentEncoding: undefined,
        ContentType: "application/json",
        Metadata: customMetadata
      });
    }
  };
}

test("copies collisions and permits only approved additive prefixes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-"));
  const assets = path.join(root, "assets");
  const output = path.join(root, "output");
  fs.mkdirSync(path.join(assets, "_next/static/candidate"), {
    recursive: true
  });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  fs.writeFileSync(path.join(assets, "_next/static/candidate/new.js"), "new");
  const s3 = fakeS3({ BUILD_ID: metadata("baseline") });
  try {
    const prepared = preparePreimages({
      assetsDir: assets,
      binding,
      bucket: "bucket",
      outputDir: output,
      s3
    });
    expect(assertRemoteBaseline(prepared.manifest, s3, output)).toHaveLength(2);
    expect(prepared.manifest.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "existing-collision",
          key: "BUILD_ID"
        }),
        expect.objectContaining({
          classification: "approved-additive",
          key: "_next/static/candidate/new.js"
        })
      ])
    );
    expect(uploadCandidates(prepared.manifest, assets, s3)).toHaveLength(2);
    expect(
      assertUploadedCandidates(prepared.manifest, s3, output)
    ).toHaveLength(2);
    expect(restorePreimages(prepared.manifest, s3, output)).toHaveLength(1);
    expect(s3.objects.get("BUILD_ID").body).toBe("baseline");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("fails closed for a new mutable key with no approved additive policy", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-new-"));
  const assets = path.join(root, "assets");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  fs.writeFileSync(path.join(assets, "new-mutable.json"), "candidate");
  try {
    expect(() =>
      preparePreimages({
        assetsDir: assets,
        binding,
        bucket: "bucket",
        outputDir: path.join(root, "output"),
        s3: fakeS3()
      })
    ).toThrow("new and mutable/unapproved");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("manual rollback loads only the exact task/run/key/checksum binding", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-load-"));
  const selectedKey = manifestKey(binding);
  const manifest = validateManifest({
    binding,
    bucket: "bucket",
    createdAt: "2026-08-10T00:00:00.000Z",
    entries: [
      {
        classification: "approved-additive",
        additivePolicy: "content-addressed-build-output",
        buildId: "candidate",
        key: "_next/static/candidate/new.js",
        local: {
          contentType: "application/javascript",
          sha256: "b".repeat(64),
          size: 1
        }
      }
    ],
    manifestKey: selectedKey,
    schema: MANIFEST_SCHEMA
  });
  const body = `${JSON.stringify(manifest, null, 2)}\n`;
  const s3 = fakeS3({ [selectedKey]: metadata(body) });
  const source = path.join(root, "source.json");
  fs.writeFileSync(source, body);
  const crypto = require("crypto");
  const checksum = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");
  try {
    expect(
      loadBoundManifest({
        expectedManifestSha256: checksum,
        expectedBaselineEtag: binding.baselineEtag,
        expectedBaselineReleaseSha: binding.baselineReleaseSha,
        expectedBucket: "bucket",
        expectedReleaseSha: binding.releaseSha,
        expectedRunId: binding.runId,
        expectedRunAttempt: binding.runAttempt,
        expectedTaskId: binding.taskId,
        localPath: path.join(root, "download.json"),
        manifestKey: selectedKey,
        s3
      })
    ).toMatchObject({ binding });
    expect(() =>
      loadBoundManifest({
        expectedManifestSha256: checksum,
        expectedBaselineEtag: binding.baselineEtag,
        expectedBaselineReleaseSha: binding.baselineReleaseSha,
        expectedBucket: "bucket",
        expectedReleaseSha: binding.releaseSha,
        expectedRunId: "999",
        expectedRunAttempt: binding.runAttempt,
        expectedTaskId: binding.taskId,
        localPath: path.join(root, "wrong.json"),
        manifestKey: selectedKey,
        s3
      })
    ).toThrow("runId binding mismatch");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("binds recovery evidence to an exact GitHub run attempt", () => {
  expect(evidencePrefix(binding)).toContain(
    `/${binding.runId}/${binding.runAttempt}/${binding.releaseSha}`
  );
  expect(evidencePrefix({ ...binding, runAttempt: "2" })).not.toBe(
    evidencePrefix(binding)
  );
});

test("requires strong content addressing and rejects symlinks", () => {
  expect(
    isContentAddressedAdditive("_next/static/chunk-deadbeef.js", "candidate")
  ).toBe(false);
  expect(
    isContentAddressedAdditive(
      "_next/static/chunk-deadbeefdeadbeef.js",
      "candidate"
    )
  ).toBe(true);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-link-"));
  const assets = path.join(root, "assets");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  fs.symlinkSync(path.join(assets, "BUILD_ID"), path.join(assets, "link"));
  try {
    expect(() =>
      preparePreimages({
        assetsDir: assets,
        binding,
        bucket: "bucket",
        outputDir: path.join(root, "output"),
        s3: fakeS3()
      })
    ).toThrow("unsupported non-regular entry");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("attempts every collision and reports partial restore evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-aggregate-"));
  const assets = path.join(root, "assets");
  const output = path.join(root, "output");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  fs.writeFileSync(path.join(assets, "build-manifest.json"), "candidate");
  const s3 = fakeS3({
    BUILD_ID: metadata("baseline-id"),
    "build-manifest.json": metadata("baseline-manifest")
  });
  try {
    const prepared = preparePreimages({
      assetsDir: assets,
      binding: { ...binding, runAttempt: "3" },
      bucket: "bucket",
      outputDir: output,
      s3
    });
    const collisions = prepared.manifest.entries.filter(
      entry => entry.classification === "existing-collision"
    );
    uploadCandidates(prepared.manifest, assets, s3);
    s3.objects.delete(collisions[0].preimageKey);
    let failure;
    try {
      restorePreimages(prepared.manifest, s3, output);
    } catch (error) {
      failure = error;
    }
    expect(failure.restoreResult.failures).toHaveLength(1);
    expect(failure.restoreResult.restored).toHaveLength(1);
    expect(s3.objects.get(failure.restoreResult.restored[0].key).body).toMatch(
      /^baseline-/
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("conditional candidate uploads preserve concurrent collision and additive writes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-upload-race-"));
  const assets = path.join(root, "assets");
  const output = path.join(root, "output");
  fs.mkdirSync(path.join(assets, "_next/static/candidate"), {
    recursive: true
  });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  fs.writeFileSync(path.join(assets, "_next/static/candidate/new.js"), "new");
  const s3 = fakeS3({ BUILD_ID: metadata("baseline") });
  try {
    const prepared = preparePreimages({
      assetsDir: assets,
      binding: { ...binding, runAttempt: "4" },
      bucket: "bucket",
      outputDir: output,
      s3
    });
    s3.objects.set("BUILD_ID", metadata("concurrent", "concurrent-v1"));
    expect(() => uploadCandidates(prepared.manifest, assets, s3)).toThrow(
      "candidate destination changed"
    );
    expect(s3.objects.get("BUILD_ID").body).toBe("concurrent");

    const collision = prepared.manifest.entries.find(
      entry => entry.key === "BUILD_ID"
    );
    s3.objects.set("BUILD_ID", {
      ...s3.objects.get(collision.preimageKey),
      VersionId: "reset-baseline"
    });
    s3.objects.set(
      "_next/static/candidate/new.js",
      metadata("concurrent-additive", "concurrent-v2")
    );
    expect(() => uploadCandidates(prepared.manifest, assets, s3)).toThrow(
      "candidate destination must be absent"
    );
    expect(s3.objects.get("_next/static/candidate/new.js").body).toBe(
      "concurrent-additive"
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("preimage and manifest evidence writes refuse existing destinations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-evidence-race-"));
  const assets = path.join(root, "assets");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  const raceBinding = { ...binding, runAttempt: "5" };
  const preimageKey = `${evidencePrefix(raceBinding)}/preimages/BUILD_ID`;
  const s3 = fakeS3({
    BUILD_ID: metadata("baseline"),
    [preimageKey]: metadata("concurrent-evidence")
  });
  try {
    expect(() =>
      preparePreimages({
        assetsDir: assets,
        binding: raceBinding,
        bucket: "bucket",
        outputDir: path.join(root, "output"),
        s3
      })
    ).toThrow("already exists");
    expect(s3.objects.get(preimageKey).body).toBe("concurrent-evidence");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("conditional restore refuses drift introduced after rollback inspection", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hec-s3-restore-race-"));
  const assets = path.join(root, "assets");
  const output = path.join(root, "output");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "BUILD_ID"), "candidate");
  const s3 = fakeS3({ BUILD_ID: metadata("baseline") });
  try {
    const prepared = preparePreimages({
      assetsDir: assets,
      binding: { ...binding, runAttempt: "6" },
      bucket: "bucket",
      outputDir: output,
      s3
    });
    uploadCandidates(prepared.manifest, assets, s3);
    const copy = s3.copy.bind(s3);
    s3.copy = (source, destination, conditions = {}) => {
      if (conditions.destinationIfMatch) {
        s3.objects.set(destination, metadata("concurrent", "concurrent-v3"));
      }
      return copy(source, destination, conditions);
    };
    expect(() => restorePreimages(prepared.manifest, s3, output)).toThrow(
      "destination precondition failed"
    );
    expect(s3.objects.get("BUILD_ID").body).toBe("concurrent");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});
