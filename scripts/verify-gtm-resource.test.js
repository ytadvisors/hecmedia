const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  analyzeSource,
  assertExpectedResource,
  canonicalize,
  extractDataResource,
  normalizedInventory,
  parseExpectedCounts,
  REQUIRED_OWNER_DECISION_SURFACES,
  verifyOwnerApproval
} = require("./verify-gtm-resource");

const temporaryDirectories = [];

afterEach(() => {
  temporaryDirectories.splice(0).forEach(directory => {
    fs.rmSync(directory, { force: true, recursive: true });
  });
});

function ownerApprovalFixture(overrides = {}) {
  return {
    analyticsOwner: "Analytics Owner",
    approvedAt: "2026-08-10T08:00:00.000Z",
    containerId: "GTM-57RZPNN",
    decisions: REQUIRED_OWNER_DECISION_SURFACES.map(surface => ({
      decision: "APPROVED",
      surface
    })),
    publicResource: {
      canonicalization: "canonical-resource-v1",
      canonicalSha256:
        "c3ab2446ed4ff8b9f4c0c8264b537d0c63fa4a209af365dde8270b205e172c0c",
      counts: "22/34/31/18",
      inventorySchema: "gtm-normalized-inventory-v1",
      inventorySha256:
        "dac02aa2664beebf11ff639df635a63f2fc739a5db57153da931c6b2dce301e0",
      version: "21"
    },
    publishFreeze: {
      owner: "Analytics Owner",
      startedAt: "2026-08-10T08:00:00.000Z",
      status: "ACTIVE"
    },
    publishedExport: {
      artifactPath: "docs/operations/evidence/gtm-published-v21.json",
      containerPublicId: "GTM-57RZPNN",
      containerVersionId: "21",
      exportFormatVersion: 2,
      sha256: null
    },
    schema: "hecmedia-gtm-owner-approval-v1",
    status: "GO",
    ...overrides
  };
}

function expectedOwnerEnvironment() {
  return {
    EXPECTED_GTM_CANONICAL_SHA256:
      "c3ab2446ed4ff8b9f4c0c8264b537d0c63fa4a209af365dde8270b205e172c0c",
    EXPECTED_GTM_COUNTS: "22/34/31/18",
    EXPECTED_GTM_INVENTORY_SHA256:
      "dac02aa2664beebf11ff639df635a63f2fc739a5db57153da931c6b2dce301e0",
    EXPECTED_GTM_RESOURCE_VERSION: "21"
  };
}

function writeOwnerFixture(approval) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hec-gtm-owner-"));
  temporaryDirectories.push(repoRoot);
  const evidenceDirectory = path.join(repoRoot, "docs/operations/evidence");
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const exportBody = `${JSON.stringify({
    containerVersion: {
      container: { publicId: "GTM-57RZPNN" },
      containerVersionId: "21"
    },
    exportFormatVersion: 2
  })}\n`;
  const exportPath = path.join(evidenceDirectory, "gtm-published-v21.json");
  fs.writeFileSync(exportPath, exportBody);
  const exportSha256 = crypto
    .createHash("sha256")
    .update(exportBody)
    .digest("hex");
  const boundApproval = {
    ...approval,
    publishedExport: {
      ...approval.publishedExport,
      sha256: exportSha256
    }
  };
  const approvalPath = path.join(repoRoot, "owner-approval.json");
  fs.writeFileSync(approvalPath, `${JSON.stringify(boundApproval, null, 2)}\n`);
  return { approvalPath, repoRoot };
}

function loader(resource, whitespace = "") {
  return `${whitespace}var data = ${JSON.stringify({
    resource
  })};\n(function(){})();`;
}

test("canonical-resource-v1 ignores object-key and transport whitespace changes", () => {
  const first = analyzeSource(
    loader({ version: "21", tags: [{ b: 2, a: 1 }], rules: [], predicates: [] })
  );
  const second = analyzeSource(
    loader(
      { predicates: [], rules: [], tags: [{ a: 1, b: 2 }], version: "21" },
      "\n\n"
    )
  );

  expect(first.canonicalSha256).toBe(second.canonicalSha256);
  expect(first.inventorySha256).toBe(second.inventorySha256);
});

test("array order and semantic tag changes change the gate hash", () => {
  const first = analyzeSource(
    loader({ version: "21", tags: [{ id: "G-ONE" }, { id: "G-TWO" }] })
  );
  const reordered = analyzeSource(
    loader({ version: "21", tags: [{ id: "G-TWO" }, { id: "G-ONE" }] })
  );
  const changed = analyzeSource(
    loader({ version: "21", tags: [{ id: "G-ONE" }, { id: "G-THREE" }] })
  );

  expect(reordered.canonicalSha256).not.toBe(first.canonicalSha256);
  expect(changed.canonicalSha256).not.toBe(first.canonicalSha256);
});

test("fails closed on ambiguous or malformed var data extraction", () => {
  expect(() => extractDataResource("var data = {}; var data = {};")).toThrow(
    "exactly one"
  );
  expect(() => extractDataResource("var data = {notJson:true};")).toThrow(
    "JSON parse failed"
  );
  expect(() => extractDataResource("var data = {};")).toThrow("data.resource");
});

test("requires the approved version and canonical semantic hash", () => {
  const analysis = analyzeSource(loader({ version: "21", tags: [] }));
  expect(() =>
    assertExpectedResource(analysis, {
      canonicalSha256: analysis.canonicalSha256,
      counts: parseExpectedCounts("0/0/0/0"),
      inventorySha256: analysis.inventorySha256,
      resourceVersion: "21"
    })
  ).not.toThrow();
  expect(() =>
    assertExpectedResource(analysis, {
      canonicalSha256: "f".repeat(64),
      counts: analysis.counts,
      inventorySha256: analysis.inventorySha256,
      resourceVersion: "21"
    })
  ).toThrow("canonical resource");
  expect(canonicalize({ b: 2, a: 1 })).toEqual({ a: 1, b: 2 });
});

test("inventory includes numeric IDs, labels, bare destinations, types, and rule mappings", () => {
  const inventory = normalizedInventory({
    macros: [],
    predicates: [{ function: "_eq", arg1: "/" }],
    rules: [[["if", 0], ["add", 0]]],
    tags: [
      {
        function: "__awct",
        tag_id: 30,
        vtp_conversionId: "795405937",
        vtp_conversionLabel: "AHIkCNj1_osBEPHco_sC",
        vtp_html:
          "//connect.facebook.net/en_US/fbevents.js downloads.mailchimp.com 420290078314527"
      }
    ],
    version: "21"
  });

  expect(inventory.numericTokens).toEqual(
    expect.arrayContaining(["795405937", "420290078314527"])
  );
  expect(inventory.domainTokens.join(" ")).toContain("downloads.mailchimp.com");
  expect(inventory.tagTypes).toContain("__awct");
  expect(inventory.tags[0].conversionLabels).toContain("AHIkCNj1_osBEPHco_sC");
  expect(inventory.rules[0].addedTags).toEqual([
    expect.objectContaining({
      index: 0,
      provider: "google-ads-conversion",
      tagId: 30,
      type: "__awct"
    })
  ]);
  expect(inventory.domainTokens).not.toContain("c.co");
  expect(inventory.domainTokens).not.toContain("navigator.us");
});

test("inventory maps every tag in a rule and only exact conversion-label fields", () => {
  const inventory = normalizedInventory({
    macros: [],
    predicates: [],
    rules: [["if", ["add", 0, 1, 2]]],
    tags: [
      { function: "__ua", vtp_eventLabel: ["macro", 5] },
      { function: "__awct", vtp_conversionLabel: "real-label" },
      { function: "__html", vtp_html: "//downloads.mailchimp.com/embed.js" }
    ],
    version: "21"
  });
  expect(inventory.rules[0].addedTags.map(tag => tag.index)).toEqual([0, 1, 2]);
  expect(inventory.tags[0].conversionLabels).toEqual([]);
  expect(inventory.tags[1].conversionLabels).toEqual(["real-label"]);
  expect(inventory.tags[2].networkDestinations).toEqual([
    "//downloads.mailchimp.com/embed.js"
  ]);
});

test("parses and rejects the immutable resource-count input", () => {
  expect(parseExpectedCounts("22/34/31/18")).toEqual({
    macros: 22,
    predicates: 31,
    rules: 18,
    tags: 34
  });
  expect(() => parseExpectedCounts("22,34,31,18")).toThrow(
    "macros/tags/predicates/rules"
  );
});

test("pins the reviewed public v21 resource and complete normalized inventory", () => {
  const resource = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures/gtm-resource-v21-canonical.json"),
      "utf8"
    )
  );
  const analysis = analyzeSource(loader(resource));
  expect(analysis).toMatchObject({
    canonicalBytes: 19588,
    canonicalSha256:
      "c3ab2446ed4ff8b9f4c0c8264b537d0c63fa4a209af365dde8270b205e172c0c",
    counts: { macros: 22, predicates: 31, rules: 18, tags: 34 },
    inventorySha256:
      "dac02aa2664beebf11ff639df635a63f2fc739a5db57153da931c6b2dce301e0",
    resourceVersion: "21"
  });
  expect(analysis.inventory.rules[5].addedTags).toHaveLength(16);
  expect(analysis.inventory.configuredIds).toEqual(
    expect.arrayContaining([
      "AW-123456789",
      "AW-866730806",
      "G-7HGHHBRHPT",
      "GTM-KXDQM43",
      "UA-13018774-2"
    ])
  );
});

test("accepts a checksum-bound GO owner record and reviewed export", () => {
  const fixture = writeOwnerFixture(ownerApprovalFixture());
  expect(
    verifyOwnerApproval(fixture.approvalPath, expectedOwnerEnvironment(), {
      repoRoot: fixture.repoRoot
    })
  ).toEqual({
    analyticsOwner: "Analytics Owner",
    approvedAt: "2026-08-10T08:00:00.000Z",
    exportPath: "docs/operations/evidence/gtm-published-v21.json",
    publishFreezeOwner: "Analytics Owner",
    resourceVersion: "21"
  });
});

test("fails closed on pending approval, semantic drift, and export drift", () => {
  const pending = writeOwnerFixture(
    ownerApprovalFixture({ status: "PENDING" })
  );
  expect(() =>
    verifyOwnerApproval(pending.approvalPath, expectedOwnerEnvironment(), {
      repoRoot: pending.repoRoot
    })
  ).toThrow("not GO");

  const semanticDrift = writeOwnerFixture(ownerApprovalFixture());
  expect(() =>
    verifyOwnerApproval(
      semanticDrift.approvalPath,
      {
        ...expectedOwnerEnvironment(),
        EXPECTED_GTM_RESOURCE_VERSION: "22"
      },
      { repoRoot: semanticDrift.repoRoot }
    )
  ).toThrow("version drifted");

  const exportDrift = writeOwnerFixture(ownerApprovalFixture());
  fs.appendFileSync(
    path.join(
      exportDrift.repoRoot,
      "docs/operations/evidence/gtm-published-v21.json"
    ),
    "{}\n"
  );
  expect(() =>
    verifyOwnerApproval(exportDrift.approvalPath, expectedOwnerEnvironment(), {
      repoRoot: exportDrift.repoRoot
    })
  ).toThrow("checksum mismatch");
});

test("fails closed when any owner decision or publish freeze is not approved", () => {
  const decisionPending = writeOwnerFixture(
    ownerApprovalFixture({
      decisions: REQUIRED_OWNER_DECISION_SURFACES.map(surface => ({
        decision:
          surface === REQUIRED_OWNER_DECISION_SURFACES[0]
            ? "PENDING"
            : "APPROVED",
        surface
      }))
    })
  );
  expect(() =>
    verifyOwnerApproval(
      decisionPending.approvalPath,
      expectedOwnerEnvironment(),
      { repoRoot: decisionPending.repoRoot }
    )
  ).toThrow("Every GTM destination/consent decision");

  const freezePending = writeOwnerFixture(
    ownerApprovalFixture({
      publishFreeze: {
        owner: "Analytics Owner",
        startedAt: "2026-08-10T08:00:00.000Z",
        status: "PENDING"
      }
    })
  );
  expect(() =>
    verifyOwnerApproval(
      freezePending.approvalPath,
      expectedOwnerEnvironment(),
      { repoRoot: freezePending.repoRoot }
    )
  ).toThrow("publish freeze is not active");
});

test("fails closed when the owner record omits a required decision or export binding", () => {
  const missingDecision = writeOwnerFixture(
    ownerApprovalFixture({
      decisions: REQUIRED_OWNER_DECISION_SURFACES.slice(1).map(surface => ({
        decision: "APPROVED",
        surface
      }))
    })
  );
  expect(() =>
    verifyOwnerApproval(
      missingDecision.approvalPath,
      expectedOwnerEnvironment(),
      { repoRoot: missingDecision.repoRoot }
    )
  ).toThrow("Every GTM destination/consent decision");

  const wrongExportVersion = writeOwnerFixture(
    ownerApprovalFixture({
      publishedExport: {
        artifactPath: "docs/operations/evidence/gtm-published-v21.json",
        containerPublicId: "GTM-57RZPNN",
        containerVersionId: "20",
        exportFormatVersion: 2,
        sha256: null
      }
    })
  );
  expect(() =>
    verifyOwnerApproval(
      wrongExportVersion.approvalPath,
      expectedOwnerEnvironment(),
      { repoRoot: wrongExportVersion.repoRoot }
    )
  ).toThrow("does not bind the approved public container/version");
});
