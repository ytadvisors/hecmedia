#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");

const CANONICALIZATION_ID = "canonical-resource-v1";
const INVENTORY_SCHEMA = "gtm-normalized-inventory-v1";
const GTM_ID = "GTM-57RZPNN";
const GTM_URL = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
const REQUIRED_OWNER_DECISION_SURFACES = [
  "GA4 G-7HGHHBRHPT",
  "Universal Analytics UA-13018774-2 and Optimize GTM-KXDQM43",
  "Google Ads AW-866730806 and configured conversion labels",
  "placeholder-looking Google Ads AW-123456789",
  "Facebook Pixel 420290078314527 immediate all-page PageView",
  "Mailchimp popup and Vimeo tracking custom HTML",
  "click, form, scroll, history, link, and YouTube listeners",
  "consent defaults, PII handling, and outbound form/conversion policy"
].sort();
const REQUEST_HEADERS = {
  Accept: "application/javascript",
  "Accept-Encoding": "identity",
  "Cache-Control": "no-cache",
  "User-Agent": "HECMedia-GTM-Audit/2026-08-10"
};

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function extractDataResource(source) {
  const assignments = Array.from(
    String(source || "").matchAll(/\bvar\s+data\s*=\s*/g)
  );
  if (assignments.length !== 1) {
    throw new Error(
      `Expected exactly one GTM var data assignment; found ${assignments.length}.`
    );
  }
  const start = assignments[0].index + assignments[0][0].length;
  if (source[start] !== "{") {
    throw new Error(
      "GTM var data assignment did not begin with a JSON object."
    );
  }
  let depth = 0;
  let escaped = false;
  let inString = false;
  let end = -1;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }
  if (end < 0 || depth !== 0 || inString) {
    throw new Error("GTM var data JSON object was incomplete.");
  }
  let data;
  try {
    data = JSON.parse(source.slice(start, end));
  } catch (error) {
    throw new Error(`GTM var data JSON parse failed: ${error.message}`);
  }
  if (!data || !data.resource || typeof data.resource !== "object") {
    throw new Error("GTM var data did not contain data.resource.");
  }
  return data.resource;
}

function stringsIn(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach(item => stringsIn(item, result));
  else if (value && typeof value === "object") {
    Object.keys(value).forEach(key => stringsIn(value[key], result));
  }
  return result;
}

function scalarRecords(value, currentPath = "$", result = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scalarRecords(item, `${currentPath}[${index}]`, result)
    );
  } else if (value && typeof value === "object") {
    Object.keys(value)
      .sort()
      .forEach(key =>
        scalarRecords(value[key], `${currentPath}.${key}`, result)
      );
  } else {
    result.push({ path: currentPath, value });
  }
  return result;
}

function matchesIn(strings, pattern) {
  const values = new Set();
  strings.forEach(value => {
    (value.match(pattern) || []).forEach(match => values.add(match));
  });
  return Array.from(values).sort();
}

function domainTokensIn(strings) {
  return matchesIn(
    strings,
    /(?:https?:)?\/\/[A-Za-z0-9._~-]+(?::[0-9]+)?(?:\/[^\s"'<>\\]*)?|\b(?:[A-Za-z0-9-]+\.)+(?:com|org|net|io|tv)(?:\/[^\s"'<>\\]*)?/gi
  );
}

const TAG_PROVIDERS = {
  __awct: "google-ads-conversion",
  __cl: "click-listener",
  __fsl: "form-submit-listener",
  __googtag: "google-tag",
  __hl: "history-listener",
  __html: "custom-html",
  __lcl: "link-click-listener",
  __opt: "google-optimize",
  __sdl: "scroll-depth-listener",
  __ua: "universal-analytics",
  __ytl: "youtube-listener"
};

function normalizedInventory(resource) {
  const resourceStrings = stringsIn(resource);
  const summarizeItems = name =>
    (Array.isArray(resource[name]) ? resource[name] : []).map((item, index) => {
      const canonical = JSON.stringify(canonicalize(item));
      const strings = stringsIn(item);
      const scalars = scalarRecords(item);
      const type =
        item && typeof item === "object" && !Array.isArray(item)
          ? item.function || null
          : null;
      const customHtmlStrings = scalars
        .filter(
          record =>
            record.path.endsWith(".vtp_html") &&
            typeof record.value === "string"
        )
        .map(record => record.value);
      return {
        canonicalSha256: sha256(canonical),
        conversionLabels: scalars
          .filter(record => record.path.endsWith(".vtp_conversionLabel"))
          .map(record => String(record.value))
          .sort(),
        configuredDomainTokens: domainTokensIn(strings),
        ids: matchesIn(strings, /\b(?:GTM|G|UA|AW)-[A-Z0-9-]+\b/g),
        index,
        networkDestinations: domainTokensIn(customHtmlStrings),
        numericTokens: matchesIn(strings, /\b[0-9]{6,}\b/g),
        provider: TAG_PROVIDERS[type] || "unknown",
        scalarRecords: scalars,
        tagId:
          item && typeof item === "object" && !Array.isArray(item)
            ? item.tag_id || null
            : null,
        type
      };
    });
  const tagSummaries = summarizeItems("tags");
  const predicateSummaries = summarizeItems("predicates");
  const ruleSummaries = (Array.isArray(resource.rules)
    ? resource.rules
    : []
  ).map((rule, index) => {
    const operations = Array.isArray(rule) ? rule : [];
    const indexesFor = operation =>
      operations
        .filter(item => Array.isArray(item) && item[0] === operation)
        .slice()
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right))
        );
    const tagReference = tagIndex => ({
      configuredDomainTokens: tagSummaries[tagIndex]
        ? tagSummaries[tagIndex].configuredDomainTokens
        : [],
      conversionLabels: tagSummaries[tagIndex]
        ? tagSummaries[tagIndex].conversionLabels
        : [],
      ids: tagSummaries[tagIndex] ? tagSummaries[tagIndex].ids : [],
      index: tagIndex,
      networkDestinations: tagSummaries[tagIndex]
        ? tagSummaries[tagIndex].networkDestinations
        : [],
      numericTokens: tagSummaries[tagIndex]
        ? tagSummaries[tagIndex].numericTokens
        : [],
      provider: tagSummaries[tagIndex] ? tagSummaries[tagIndex].provider : null,
      tagId: tagSummaries[tagIndex] ? tagSummaries[tagIndex].tagId : null,
      type: tagSummaries[tagIndex] ? tagSummaries[tagIndex].type : null
    });
    const predicateReference = predicateIndex => ({
      index: predicateIndex,
      scalarRecords: predicateSummaries[predicateIndex]
        ? predicateSummaries[predicateIndex].scalarRecords
        : [],
      type: predicateSummaries[predicateIndex]
        ? predicateSummaries[predicateIndex].type
        : null
    });
    return {
      addedTags: indexesFor("add").flatMap(item =>
        item.slice(1).map(tagReference)
      ),
      blockedTags: indexesFor("block").flatMap(item =>
        item.slice(1).map(tagReference)
      ),
      canonicalSha256: sha256(JSON.stringify(canonicalize(rule))),
      ifPredicates: indexesFor("if").flatMap(item =>
        item.slice(1).map(predicateReference)
      ),
      index,
      operations,
      unlessPredicates: indexesFor("unless").flatMap(item =>
        item.slice(1).map(predicateReference)
      )
    };
  });
  return canonicalize({
    configuredIds: matchesIn(
      resourceStrings,
      /\b(?:GTM|G|UA|AW)-[A-Z0-9-]+\b/g
    ),
    domainTokens: domainTokensIn(resourceStrings),
    inventorySchema: INVENTORY_SCHEMA,
    macros: summarizeItems("macros"),
    numericTokens: matchesIn(resourceStrings, /\b[0-9]{6,}\b/g),
    predicates: predicateSummaries,
    rules: ruleSummaries,
    scalarRecords: scalarRecords(resource),
    tags: tagSummaries,
    tagTypes: Array.from(
      new Set(tagSummaries.map(tag => tag.type).filter(Boolean))
    ).sort()
  });
}

function analyzeSource(source) {
  const resource = extractDataResource(source);
  const canonical = JSON.stringify(canonicalize(resource));
  const inventory = normalizedInventory(resource);
  const inventoryJson = JSON.stringify(inventory);
  return {
    canonical,
    canonicalBytes: Buffer.byteLength(canonical),
    canonicalSha256: sha256(canonical),
    counts: {
      macros: Array.isArray(resource.macros) ? resource.macros.length : 0,
      predicates: Array.isArray(resource.predicates)
        ? resource.predicates.length
        : 0,
      rules: Array.isArray(resource.rules) ? resource.rules.length : 0,
      tags: Array.isArray(resource.tags) ? resource.tags.length : 0
    },
    inventory,
    inventorySchema: INVENTORY_SCHEMA,
    inventorySha256: sha256(inventoryJson),
    resourceVersion: String(resource.version || "")
  };
}

function assertExpectedResource(analysis, expected) {
  if (!/^[1-9][0-9]*$/.test(String(expected.resourceVersion || ""))) {
    throw new Error(
      "Expected GTM resource version must be a positive integer."
    );
  }
  if (!/^[0-9a-f]{64}$/.test(expected.canonicalSha256 || "")) {
    throw new Error("Expected GTM canonical SHA-256 is invalid.");
  }
  if (!/^[0-9a-f]{64}$/.test(expected.inventorySha256 || "")) {
    throw new Error("Expected GTM normalized inventory SHA-256 is invalid.");
  }
  const expectedCounts = expected.counts;
  if (
    !expectedCounts ||
    ["macros", "tags", "predicates", "rules"].some(
      name =>
        !Number.isInteger(expectedCounts[name]) || expectedCounts[name] < 0
    )
  ) {
    throw new Error("Expected GTM resource counts are invalid.");
  }
  if (analysis.resourceVersion !== String(expected.resourceVersion)) {
    throw new Error(
      `GTM resource version drifted: expected ${expected.resourceVersion}, found ${analysis.resourceVersion}.`
    );
  }
  if (analysis.canonicalSha256 !== expected.canonicalSha256) {
    throw new Error("GTM canonical resource SHA-256 drifted.");
  }
  if (analysis.inventorySchema !== INVENTORY_SCHEMA) {
    throw new Error("GTM normalized inventory schema drifted.");
  }
  if (analysis.inventorySha256 !== expected.inventorySha256) {
    throw new Error("GTM normalized inventory SHA-256 drifted.");
  }
  if (
    ["macros", "tags", "predicates", "rules"].some(
      name => analysis.counts[name] !== expectedCounts[name]
    )
  ) {
    throw new Error("GTM macro/tag/predicate/rule counts drifted.");
  }
}

function parseExpectedCounts(value) {
  const match = String(value || "").match(
    /^([0-9]+)\/([0-9]+)\/([0-9]+)\/([0-9]+)$/
  );
  if (!match) {
    throw new Error(
      "EXPECTED_GTM_COUNTS must use macros/tags/predicates/rules format."
    );
  }
  return {
    macros: Number(match[1]),
    tags: Number(match[2]),
    predicates: Number(match[3]),
    rules: Number(match[4])
  };
}

function fetchSource() {
  return new Promise((resolve, reject) => {
    const request = https.get(
      GTM_URL,
      { headers: REQUEST_HEADERS },
      response => {
        const chunks = [];
        response.on("data", chunk => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks);
          if (response.statusCode !== 200) {
            reject(
              new Error(`GTM loader returned HTTP ${response.statusCode}.`)
            );
            return;
          }
          if (
            !String(response.headers["content-type"] || "").includes(
              "application/javascript"
            )
          ) {
            reject(
              new Error("GTM loader returned an unexpected content type.")
            );
            return;
          }
          resolve({
            body,
            headers: response.headers,
            statusCode: response.statusCode
          });
        });
      }
    );
    request.setTimeout(30000, () =>
      request.destroy(new Error("GTM loader request timed out."))
    );
    request.on("error", reject);
  });
}

async function verifyPublicResource(options = {}) {
  const {
    expectedCanonicalSha256,
    expectedCounts,
    expectedInventorySha256,
    expectedResourceVersion,
    outputDir,
    phase = "capture"
  } = options;
  if (!outputDir)
    throw new Error("GTM verification requires an output directory.");
  if (!/^[a-z0-9-]+$/.test(phase)) {
    throw new Error("GTM verification phase is invalid.");
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const response = await fetchSource();
  const source = response.body.toString("utf8");
  const analysis = analyzeSource(source);
  assertExpectedResource(analysis, {
    canonicalSha256: expectedCanonicalSha256,
    counts: expectedCounts,
    inventorySha256: expectedInventorySha256,
    resourceVersion: expectedResourceVersion
  });
  const canonicalPath = path.join(outputDir, `gtm-${phase}-canonical.json`);
  const inventoryPath = path.join(outputDir, `gtm-${phase}-inventory.json`);
  const rawPath = path.join(outputDir, `gtm-${phase}-raw.js`);
  const summaryPath = path.join(outputDir, `gtm-${phase}-summary.json`);
  fs.writeFileSync(canonicalPath, `${analysis.canonical}\n`);
  fs.writeFileSync(
    inventoryPath,
    `${JSON.stringify(analysis.inventory, null, 2)}\n`
  );
  fs.writeFileSync(rawPath, response.body);
  const summary = {
    canonicalBytes: analysis.canonicalBytes,
    canonicalSha256: analysis.canonicalSha256,
    canonicalizationId: CANONICALIZATION_ID,
    capturedAt: new Date().toISOString(),
    counts: analysis.counts,
    headers: {
      cacheControl: response.headers["cache-control"] || null,
      contentType: response.headers["content-type"] || null,
      date: response.headers.date || null,
      lastModified: response.headers["last-modified"] || "absent",
      vary: response.headers.vary || null
    },
    inventorySha256: analysis.inventorySha256,
    inventorySchema: analysis.inventorySchema,
    phase,
    rawBytes: response.body.length,
    rawSha256: sha256(response.body),
    rawSha256Role: "secondary_non_gate",
    request: { headers: REQUEST_HEADERS, method: "GET", url: GTM_URL },
    resourceVersion: analysis.resourceVersion,
    statusCode: response.statusCode
  };
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

function verifyOwnerApproval(approvalPath, env = process.env, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(__dirname, ".."));
  if (!approvalPath || !fs.existsSync(approvalPath)) {
    throw new Error("GTM owner approval record is missing.");
  }
  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  if (
    approval.schema !== "hecmedia-gtm-owner-approval-v1" ||
    approval.status !== "GO"
  ) {
    throw new Error("GTM owner approval is not GO.");
  }
  if (
    typeof approval.analyticsOwner !== "string" ||
    approval.analyticsOwner.trim().length < 3 ||
    approval.analyticsOwner.length > 120 ||
    !approval.approvedAt ||
    Number.isNaN(Date.parse(approval.approvedAt))
  ) {
    throw new Error("GTM owner identity/timestamp is missing or invalid.");
  }
  const expected = {
    canonicalSha256: env.EXPECTED_GTM_CANONICAL_SHA256,
    counts: env.EXPECTED_GTM_COUNTS,
    inventorySha256: env.EXPECTED_GTM_INVENTORY_SHA256,
    version: env.EXPECTED_GTM_RESOURCE_VERSION
  };
  Object.entries(expected).forEach(([name, value]) => {
    if (
      String(approval.publicResource && approval.publicResource[name]) !==
      String(value)
    ) {
      throw new Error(`GTM owner approval ${name} drifted.`);
    }
  });
  if (
    approval.containerId !== GTM_ID ||
    approval.publicResource.canonicalization !== CANONICALIZATION_ID ||
    approval.publicResource.inventorySchema !== INVENTORY_SCHEMA
  ) {
    throw new Error("GTM owner approval schema/container contract drifted.");
  }
  const exportPath =
    approval.publishedExport && approval.publishedExport.artifactPath;
  if (
    !/^docs\/operations\/evidence\/[A-Za-z0-9._/-]+\.json$/.test(
      exportPath || ""
    ) ||
    path.posix.normalize(exportPath || "") !== exportPath ||
    !/^[0-9a-f]{64}$/.test(
      (approval.publishedExport && approval.publishedExport.sha256) || ""
    )
  ) {
    throw new Error("Reviewed GTM export evidence is missing or unsafe.");
  }
  const absoluteExportPath = path.resolve(repoRoot, exportPath);
  const evidenceRoot = `${path.resolve(repoRoot, "docs/operations/evidence")}${
    path.sep
  }`;
  let exportStats = null;
  if (fs.existsSync(absoluteExportPath)) {
    exportStats = fs.lstatSync(absoluteExportPath);
  }
  if (
    !absoluteExportPath.startsWith(evidenceRoot) ||
    !exportStats ||
    !exportStats.isFile() ||
    exportStats.isSymbolicLink() ||
    exportStats.size > 10 * 1024 * 1024 ||
    sha256(fs.readFileSync(absoluteExportPath)) !==
      approval.publishedExport.sha256
  ) {
    throw new Error("Reviewed GTM export artifact checksum mismatch.");
  }
  let publishedExport;
  try {
    publishedExport = JSON.parse(fs.readFileSync(absoluteExportPath, "utf8"));
  } catch (error) {
    throw new Error(`Reviewed GTM export JSON is invalid: ${error.message}`);
  }
  const exportedContainerVersion = publishedExport.containerVersion || {};
  const exportedContainer = exportedContainerVersion.container || {};
  if (
    publishedExport.exportFormatVersion !== 2 ||
    approval.publishedExport.exportFormatVersion !== 2 ||
    approval.publishedExport.containerPublicId !== GTM_ID ||
    approval.publishedExport.containerVersionId !==
      approval.publicResource.version ||
    exportedContainer.publicId !== GTM_ID ||
    String(exportedContainerVersion.containerVersionId || "") !==
      approval.publicResource.version
  ) {
    throw new Error(
      "Reviewed GTM export does not bind the approved public container/version."
    );
  }
  if (
    !approval.publishFreeze ||
    approval.publishFreeze.status !== "ACTIVE" ||
    !approval.publishFreeze.owner ||
    !approval.publishFreeze.startedAt ||
    Number.isNaN(Date.parse(approval.publishFreeze.startedAt))
  ) {
    throw new Error("GTM publish freeze is not active.");
  }
  const decisionSurfaces = Array.isArray(approval.decisions)
    ? approval.decisions.map(item => item.surface).sort()
    : [];
  if (
    decisionSurfaces.length !== REQUIRED_OWNER_DECISION_SURFACES.length ||
    JSON.stringify(decisionSurfaces) !==
      JSON.stringify(REQUIRED_OWNER_DECISION_SURFACES) ||
    approval.decisions.some(item => item.decision !== "APPROVED")
  ) {
    throw new Error("Every GTM destination/consent decision must be APPROVED.");
  }
  return {
    analyticsOwner: approval.analyticsOwner,
    approvedAt: approval.approvedAt,
    exportPath,
    publishFreezeOwner: approval.publishFreeze.owner,
    resourceVersion: approval.publicResource.version
  };
}

if (require.main === module) {
  const command = process.argv[2] || "capture";
  if (command === "--owner-approval") {
    try {
      console.log(JSON.stringify(verifyOwnerApproval(process.argv[3])));
    } catch (error) {
      console.error(error && error.stack ? error.stack : error);
      process.exitCode = 1;
    }
  } else {
    verifyPublicResource({
      expectedCanonicalSha256: process.env.EXPECTED_GTM_CANONICAL_SHA256,
      expectedCounts: parseExpectedCounts(process.env.EXPECTED_GTM_COUNTS),
      expectedInventorySha256: process.env.EXPECTED_GTM_INVENTORY_SHA256,
      expectedResourceVersion: process.env.EXPECTED_GTM_RESOURCE_VERSION,
      outputDir:
        process.env.GTM_EVIDENCE_DIR ||
        path.join(__dirname, "..", ".production-release"),
      phase: command
    })
      .then(summary => console.log(JSON.stringify(summary)))
      .catch(error => {
        console.error(error && error.stack ? error.stack : error);
        process.exitCode = 1;
      });
  }
}

module.exports = {
  CANONICALIZATION_ID,
  GTM_ID,
  INVENTORY_SCHEMA,
  REQUIRED_OWNER_DECISION_SURFACES,
  analyzeSource,
  assertExpectedResource,
  canonicalize,
  extractDataResource,
  normalizedInventory,
  parseExpectedCounts,
  verifyOwnerApproval,
  verifyPublicResource
};
