const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MANIFEST_SCHEMA = "hecmedia-production-s3-preimage-v4";

const CONTENT_TYPES = new Map([
  [".css", "text/css"],
  [".eot", "application/vnd.ms-fontobject"],
  [".gif", "image/gif"],
  [".html", "text/html"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".map", "application/json"],
  [".otf", "font/otf"],
  [".png", "image/png"],
  [".scss", "text/x-scss"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain"],
  [".webmanifest", "application/manifest+json"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml"]
]);

function contentTypeForKey(key) {
  if (key === "BUILD_ID") return "text/plain";
  return (
    CONTENT_TYPES.get(path.extname(key).toLowerCase()) ||
    "application/octet-stream"
  );
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function sha256Text(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function listCandidateFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listCandidateFiles(absolute, base);
    if (!entry.isFile()) {
      throw new Error(
        `Candidate S3 tree contains an unsupported non-regular entry: ${absolute}`
      );
    }
    const key = path
      .relative(base, absolute)
      .split(path.sep)
      .join("/");
    if (!key || key.startsWith("../") || key.startsWith("/")) {
      throw new Error(`Unsafe candidate S3 key: ${key || "empty"}`);
    }
    return [{ absolute, key }];
  });
}

function assertSafeKey(key) {
  if (
    typeof key !== "string" ||
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some(part => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe candidate S3 key: ${key || "empty"}`);
  }
  return key;
}

function assertBinding(binding) {
  if (!/^[1-9][0-9]*$/.test(String(binding.taskId || ""))) {
    throw new Error("S3 recovery binding requires a positive deploy task ID.");
  }
  if (!/^[1-9][0-9]*$/.test(String(binding.runId || ""))) {
    throw new Error("S3 recovery binding requires a positive GitHub run ID.");
  }
  if (!/^[1-9][0-9]*$/.test(String(binding.runAttempt || ""))) {
    throw new Error(
      "S3 recovery binding requires a positive GitHub run attempt."
    );
  }
  if (!/^[0-9a-f]{40}$/.test(String(binding.releaseSha || ""))) {
    throw new Error("S3 recovery binding requires an exact release SHA.");
  }
  if (!/^[A-Z0-9]+$/.test(String(binding.baselineEtag || ""))) {
    throw new Error(
      "S3 recovery binding requires the authorized CloudFront ETag."
    );
  }
  if (!/^[0-9a-f]{40}$/.test(String(binding.baselineReleaseSha || ""))) {
    throw new Error(
      "S3 recovery binding requires the baseline public release SHA."
    );
  }
}

function evidencePrefix(binding) {
  assertBinding(binding);
  return `_deployment-evidence/${binding.taskId}/${binding.runId}/${binding.runAttempt}/${binding.releaseSha}`;
}

function manifestKey(binding) {
  return `${evidencePrefix(binding)}/s3-preimage-manifest.json`;
}

function metadataRecord(head) {
  const metadata = Object.fromEntries(
    Object.entries(head.Metadata || {}).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
  return {
    cacheControl: head.CacheControl || null,
    contentDisposition: head.ContentDisposition || null,
    contentEncoding: head.ContentEncoding || null,
    contentLanguage: head.ContentLanguage || null,
    contentLength: Number(head.ContentLength),
    contentType: head.ContentType || null,
    eTag: head.ETag || null,
    expires: head.Expires || null,
    metadata,
    websiteRedirectLocation: head.WebsiteRedirectLocation || null,
    versionId: head.VersionId || null
  };
}

function comparableMetadata(record) {
  return {
    cacheControl: record.cacheControl,
    contentDisposition: record.contentDisposition,
    contentEncoding: record.contentEncoding,
    contentLanguage: record.contentLanguage,
    contentLength: record.contentLength,
    contentType: record.contentType,
    eTag: record.eTag,
    expires: record.expires,
    metadata: record.metadata,
    websiteRedirectLocation: record.websiteRedirectLocation
  };
}

function assertMetadataMatch(expected, actual, key) {
  if (
    JSON.stringify(comparableMetadata(expected)) !==
    JSON.stringify(comparableMetadata(actual))
  ) {
    throw new Error(`S3 preimage bytes/metadata mismatch for ${key}.`);
  }
}

function isContentAddressedAdditive(key, buildId) {
  if (!buildId || /[/\\]/.test(buildId)) return false;
  if (
    key.startsWith(`_next/data/${buildId}/`) ||
    key.startsWith(`_next/static/${buildId}/`)
  ) {
    return true;
  }
  if (!key.startsWith("_next/static/")) return false;
  return /(?:^|[-.])[0-9a-f]{16,}(?=[.-]|$)/i.test(path.basename(key));
}

function classifyAbsentKey(key, options = {}) {
  const { approvedAdditiveExceptions = [], buildId } = options;
  if (isContentAddressedAdditive(key, buildId)) {
    return {
      classification: "approved-additive",
      additivePolicy: "content-addressed-build-output",
      buildId
    };
  }
  if (approvedAdditiveExceptions.includes(key)) {
    return {
      classification: "approved-additive-exception",
      additivePolicy: "exact-owner-approved-key"
    };
  }
  throw new Error(
    `Candidate key ${key} is new and mutable/unapproved; rollback cannot restore prior absence.`
  );
}

function downloadDigest(s3, key, outputDir, label) {
  const downloadDir = path.join(outputDir, "object-proof");
  fs.mkdirSync(downloadDir, { recursive: true });
  const localPath = path.join(
    downloadDir,
    `${label}-${sha256Text(key)}.object`
  );
  s3.getFile(key, localPath);
  return { localPath, sha256: sha256File(localPath) };
}

function validateManifest(manifest, expected = {}) {
  if (!manifest || manifest.schema !== MANIFEST_SCHEMA) {
    throw new Error("S3 preimage manifest schema is invalid.");
  }
  assertBinding(manifest.binding || {});
  if (manifest.manifestKey !== manifestKey(manifest.binding)) {
    throw new Error("S3 preimage manifest key does not match its binding.");
  }
  [
    "taskId",
    "runId",
    "runAttempt",
    "releaseSha",
    "baselineEtag",
    "baselineReleaseSha"
  ].forEach(field => {
    if (
      expected[field] !== undefined &&
      String(manifest.binding[field]) !== String(expected[field])
    ) {
      throw new Error(`S3 preimage manifest ${field} binding mismatch.`);
    }
  });
  if (expected.manifestKey && manifest.manifestKey !== expected.manifestKey) {
    throw new Error("S3 preimage manifest selector mismatch.");
  }
  if (expected.bucket && manifest.bucket !== expected.bucket) {
    throw new Error("S3 preimage manifest bucket mismatch.");
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error("S3 preimage manifest has no candidate entries.");
  }
  const keys = new Set();
  manifest.entries.forEach(entry => {
    assertSafeKey(entry.key);
    if (keys.has(entry.key)) {
      throw new Error("S3 preimage manifest contains a missing/duplicate key.");
    }
    keys.add(entry.key);
    if (
      !entry.local ||
      !/^[0-9a-f]{64}$/.test(entry.local.sha256 || "") ||
      !Number.isSafeInteger(entry.local.size) ||
      entry.local.size < 0 ||
      typeof entry.local.contentType !== "string" ||
      !entry.local.contentType
    ) {
      throw new Error(`S3 candidate ${entry.key} has invalid local metadata.`);
    }
    if (entry.classification === "existing-collision") {
      const expectedPreimageKey = `${evidencePrefix(
        manifest.binding
      )}/preimages/${entry.key}`;
      if (
        entry.preimageKey !== expectedPreimageKey ||
        !entry.source ||
        !entry.preimage ||
        !/^[0-9a-f]{64}$/.test(entry.source.sha256 || "") ||
        entry.source.sha256 !== entry.preimage.sha256
      ) {
        throw new Error(`S3 collision ${entry.key} has no verified preimage.`);
      }
    } else if (entry.classification === "approved-additive") {
      if (!isContentAddressedAdditive(entry.key, entry.buildId)) {
        throw new Error(`S3 additive key ${entry.key} is outside policy.`);
      }
    } else if (entry.classification === "approved-additive-exception") {
      if (entry.additivePolicy !== "exact-owner-approved-key") {
        throw new Error(`S3 additive exception ${entry.key} has no approval.`);
      }
    } else {
      throw new Error(
        `S3 candidate key ${entry.key} has no valid classification.`
      );
    }
  });
  return manifest;
}

function preparePreimages(options) {
  const {
    approvedAdditiveExceptions = [],
    assetsDir,
    binding,
    bucket,
    outputDir,
    s3
  } = options;
  assertBinding(binding);
  fs.mkdirSync(outputDir, { recursive: true });
  const buildIdPath = path.join(assetsDir, "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(
      "Candidate assets have no BUILD_ID; additive policy is undefined."
    );
  }
  const buildId = fs.readFileSync(buildIdPath, "utf8").trim();
  if (!buildId || /[/\\]/.test(buildId)) {
    throw new Error("Candidate assets contain an invalid BUILD_ID.");
  }
  const prefix = evidencePrefix(binding);
  const selectedManifestKey = manifestKey(binding);
  if (s3.head(selectedManifestKey)) {
    throw new Error(
      "Task/run/attempt S3 recovery evidence already exists; refusing to overwrite it."
    );
  }
  const entries = listCandidateFiles(assetsDir).map(candidate => {
    const local = {
      contentType: contentTypeForKey(candidate.key),
      sha256: sha256File(candidate.absolute),
      size: fs.statSync(candidate.absolute).size
    };
    const sourceHead = s3.head(candidate.key);
    if (!sourceHead) {
      return {
        key: candidate.key,
        local,
        ...classifyAbsentKey(candidate.key, {
          approvedAdditiveExceptions,
          buildId
        })
      };
    }
    const preimageKey = `${prefix}/preimages/${candidate.key}`;
    if (s3.head(preimageKey)) {
      throw new Error(
        `S3 preimage destination already exists for ${candidate.key}.`
      );
    }
    const source = {
      ...metadataRecord(sourceHead),
      sha256: downloadDigest(s3, candidate.key, outputDir, "source").sha256
    };
    s3.copy(candidate.key, preimageKey, {
      destinationIfNoneMatch: "*",
      sourceIfMatch: source.eTag
    });
    const preimageHead = s3.head(preimageKey);
    if (!preimageHead) {
      throw new Error(`S3 preimage copy is missing for ${candidate.key}.`);
    }
    const preimage = {
      ...metadataRecord(preimageHead),
      sha256: downloadDigest(s3, preimageKey, outputDir, "preimage").sha256
    };
    assertMetadataMatch(source, preimage, candidate.key);
    if (source.sha256 !== preimage.sha256) {
      throw new Error(
        `S3 preimage byte checksum mismatch for ${candidate.key}.`
      );
    }
    return {
      classification: "existing-collision",
      key: candidate.key,
      local,
      preimage,
      preimageKey,
      source
    };
  });
  const manifest = validateManifest({
    binding: { ...binding },
    bucket,
    createdAt: new Date().toISOString(),
    entries,
    manifestKey: selectedManifestKey,
    schema: MANIFEST_SCHEMA
  });
  const localManifestPath = path.join(outputDir, "s3-preimage-manifest.json");
  fs.writeFileSync(localManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const manifestSha256 = sha256File(localManifestPath);
  s3.putFile(
    manifest.manifestKey,
    localManifestPath,
    {
      manifest_sha256: manifestSha256,
      release_sha: binding.releaseSha,
      run_attempt: String(binding.runAttempt),
      run_id: String(binding.runId),
      task_id: String(binding.taskId)
    },
    { destinationIfNoneMatch: "*" }
  );
  const verificationPath = path.join(
    outputDir,
    "s3-preimage-manifest-uploaded.json"
  );
  s3.getFile(manifest.manifestKey, verificationPath);
  if (sha256File(verificationPath) !== manifestSha256) {
    throw new Error("Uploaded S3 preimage manifest checksum mismatch.");
  }
  return { localManifestPath, manifest, manifestSha256 };
}

function candidateTree(assetsDir) {
  return listCandidateFiles(assetsDir)
    .map(candidate => ({
      key: candidate.key,
      sha256: sha256File(candidate.absolute),
      size: fs.statSync(candidate.absolute).size
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function assertCandidateTree(manifest, assetsDir) {
  validateManifest(manifest);
  const byKey = (left, right) => left.key.localeCompare(right.key);
  const actual = candidateTree(assetsDir);
  const expected = manifest.entries
    .map(entry => ({
      key: entry.key,
      sha256: entry.local.sha256,
      size: entry.local.size
    }))
    .sort(byKey);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      "Candidate S3 asset tree changed after preimage capture; refusing to sync."
    );
  }
  return actual;
}

function assertRemoteBaseline(manifest, s3, outputDir) {
  validateManifest(manifest);
  const checked = [];
  manifest.entries.forEach(entry => {
    const currentHead = s3.head(entry.key);
    if (entry.classification !== "existing-collision") {
      if (currentHead) {
        throw new Error(
          `S3 additive key ${entry.key} appeared after preimage capture.`
        );
      }
      checked.push({ classification: entry.classification, key: entry.key });
      return;
    }
    if (!currentHead) {
      throw new Error(
        `S3 baseline object ${entry.key} disappeared before sync.`
      );
    }
    const current = {
      ...metadataRecord(currentHead),
      sha256: downloadDigest(s3, entry.key, outputDir, "pre-sync-current")
        .sha256
    };
    assertMetadataMatch(entry.source, current, entry.key);
    if (
      entry.source.sha256 !== current.sha256 ||
      entry.source.versionId !== current.versionId
    ) {
      throw new Error(
        `S3 baseline object ${entry.key} changed after preimage capture.`
      );
    }
    checked.push({ classification: entry.classification, key: entry.key });
  });
  return checked;
}

function uploadCandidates(manifest, assetsDir, s3) {
  validateManifest(manifest);
  assertCandidateTree(manifest, assetsDir);
  return manifest.entries.map(entry => {
    const source = path.join(assetsDir, ...entry.key.split("/"));
    const conditions =
      entry.classification === "existing-collision"
        ? { destinationIfMatch: entry.source.eTag }
        : { destinationIfNoneMatch: "*" };
    const uploaded = s3.putCandidate(entry.key, source, {
      ...conditions,
      contentType: entry.local.contentType
    });
    return {
      eTag: (uploaded && uploaded.ETag) || null,
      key: entry.key,
      versionId: (uploaded && uploaded.VersionId) || null
    };
  });
}

function assertUploadedCandidates(manifest, s3, outputDir) {
  validateManifest(manifest);
  const checked = [];
  manifest.entries.forEach(entry => {
    const uploadedHead = s3.head(entry.key);
    if (!uploadedHead) {
      throw new Error(
        `S3 candidate object ${entry.key} is missing after sync.`
      );
    }
    const uploaded = downloadDigest(
      s3,
      entry.key,
      outputDir,
      "post-sync-candidate"
    );
    if (
      uploaded.sha256 !== entry.local.sha256 ||
      Number(uploadedHead.ContentLength) !== entry.local.size ||
      uploadedHead.ContentType !== entry.local.contentType
    ) {
      throw new Error(`S3 candidate object ${entry.key} differs after sync.`);
    }
    checked.push({
      key: entry.key,
      sha256: uploaded.sha256,
      size: Number(uploadedHead.ContentLength),
      versionId: uploadedHead.VersionId || null
    });
  });
  return checked;
}

function restorePreimages(manifest, s3, outputDir) {
  validateManifest(manifest);
  if (!outputDir) {
    throw new Error("S3 restore requires a local evidence directory.");
  }
  const restored = [];
  const failures = [];
  manifest.entries.forEach(entry => {
    if (entry.classification !== "existing-collision") return;
    try {
      const downloadedPreimage = downloadDigest(
        s3,
        entry.preimageKey,
        outputDir,
        "rollback-preimage"
      );
      if (downloadedPreimage.sha256 !== entry.preimage.sha256) {
        throw new Error(
          `S3 rollback preimage checksum drifted for ${entry.key}.`
        );
      }
      const currentHead = s3.head(entry.key);
      if (!currentHead) {
        throw new Error(
          `S3 rollback destination disappeared for ${entry.key}.`
        );
      }
      const current = {
        ...metadataRecord(currentHead),
        sha256: downloadDigest(s3, entry.key, outputDir, "rollback-current")
          .sha256
      };
      const isExactBaseline =
        current.sha256 === entry.source.sha256 &&
        JSON.stringify(comparableMetadata(current)) ===
          JSON.stringify(comparableMetadata(entry.source));
      if (isExactBaseline) {
        restored.push({
          key: entry.key,
          restored: current,
          state: "already-exact-baseline"
        });
        return;
      }
      const isExactCandidate =
        current.sha256 === entry.local.sha256 &&
        current.contentLength === entry.local.size &&
        current.contentType === entry.local.contentType;
      if (!isExactCandidate) {
        throw new Error(
          `S3 rollback destination drifted outside the exact candidate/baseline states for ${entry.key}.`
        );
      }
      s3.copy(entry.preimageKey, entry.key, {
        destinationIfMatch: current.eTag,
        sourceIfMatch: entry.preimage.eTag
      });
      const restoredHead = s3.head(entry.key);
      if (!restoredHead) {
        throw new Error(`Restored S3 object is missing for ${entry.key}.`);
      }
      const restoredMetadata = {
        ...metadataRecord(restoredHead),
        sha256: downloadDigest(s3, entry.key, outputDir, "rollback-restored")
          .sha256
      };
      assertMetadataMatch(entry.preimage, restoredMetadata, entry.key);
      if (restoredMetadata.sha256 !== entry.preimage.sha256) {
        throw new Error(`Restored S3 byte checksum mismatch for ${entry.key}.`);
      }
      restored.push({
        key: entry.key,
        restored: restoredMetadata,
        state: "conditionally-restored-from-candidate"
      });
    } catch (error) {
      failures.push({
        key: entry.key,
        message: error.message || String(error)
      });
    }
  });
  if (failures.length > 0) {
    const error = new Error(
      `S3 recovery failed for ${failures.length} collision(s): ${failures
        .map(failure => `${failure.key}: ${failure.message}`)
        .join(" | ")}`
    );
    error.restoreResult = { failures, restored };
    throw error;
  }
  return restored;
}

function loadBoundManifest(options) {
  const {
    expectedBaselineEtag,
    expectedBaselineReleaseSha,
    expectedBucket,
    expectedManifestSha256,
    expectedReleaseSha,
    expectedRunId,
    expectedRunAttempt,
    expectedTaskId,
    localPath,
    manifestKey: selectedManifestKey,
    s3
  } = options;
  if (!/^[0-9a-f]{64}$/.test(expectedManifestSha256 || "")) {
    throw new Error("Manual rollback requires an exact manifest SHA-256.");
  }
  s3.getFile(selectedManifestKey, localPath);
  if (sha256File(localPath) !== expectedManifestSha256) {
    throw new Error("Manual rollback manifest checksum mismatch.");
  }
  const manifest = JSON.parse(fs.readFileSync(localPath, "utf8"));
  return validateManifest(manifest, {
    baselineEtag: expectedBaselineEtag,
    baselineReleaseSha: expectedBaselineReleaseSha,
    bucket: expectedBucket,
    manifestKey: selectedManifestKey,
    releaseSha: expectedReleaseSha,
    runId: expectedRunId,
    runAttempt: expectedRunAttempt,
    taskId: expectedTaskId
  });
}

module.exports = {
  MANIFEST_SCHEMA,
  assertCandidateTree,
  assertBinding,
  assertRemoteBaseline,
  assertUploadedCandidates,
  contentTypeForKey,
  candidateTree,
  classifyAbsentKey,
  evidencePrefix,
  loadBoundManifest,
  manifestKey,
  metadataRecord,
  preparePreimages,
  restorePreimages,
  uploadCandidates,
  sha256File,
  isContentAddressedAdditive,
  validateManifest
};
