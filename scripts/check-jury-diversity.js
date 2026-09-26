#!/usr/bin/env node
const fs = require("fs");

const LOGIN_FAMILY = Object.freeze({
  "yt-agent-tom": "anthropic",
  "yt-agent-kronos": "anthropic",
  jerome593: "anthropic",
  "yt-agent-tom-gpt": "openai",
  "yt-agent-kronos-gpt": "openai",
  "yt-agent-tom-grok": "grok",
  "yt-agent-kronos-grok": "grok"
});

const UNRELIABLE_AUTHOR_FAMILY = new Set(["jerome593"]);

function flattenReviewPages(payload) {
  if (!Array.isArray(payload)) {
    throw new TypeError("GitHub reviews response must be an array");
  }
  if (payload.every(Array.isArray)) return payload.flat();
  if (payload.every(item => item && typeof item === "object")) return payload;
  throw new TypeError("GitHub reviews response has an unexpected shape");
}

function loginFamily(login) {
  return LOGIN_FAMILY[login] || "human";
}

function authorFamily(login) {
  if (!login || UNRELIABLE_AUTHOR_FAMILY.has(login)) return null;
  if (LOGIN_FAMILY[login]) return LOGIN_FAMILY[login];
  if (/^yt-agent-/.test(login)) return null;
  return "human";
}

function evaluateMixedJury(reviewPages, author) {
  const latest = new Map();
  flattenReviewPages(reviewPages).forEach(review => {
    const login = review && review.user && review.user.login;
    if (!login || ["COMMENTED", "DISMISSED"].includes(review.state)) return;
    latest.set(login, review.state);
  });

  const approvers = [...latest]
    .filter(([, state]) => state === "APPROVED")
    .map(([login]) => login);
  const approvalFamilies = [...new Set(approvers.map(loginFamily))];
  const authorProvider = authorFamily(author);
  const satisfied = authorProvider
    ? approvalFamilies.some(family => family !== authorProvider)
    : approvalFamilies.length >= 2;

  return { approvers, approvalFamilies, authorProvider, satisfied };
}

function main() {
  const input = fs.readFileSync(0, "utf8");
  const author = process.env.AUTHOR;
  const result = evaluateMixedJury(JSON.parse(input || "[]"), author);

  console.log(
    `author=${author} (family=${result.authorProvider || "unmapped"})`
  );
  console.log(`approvers=${result.approvers.join(",") || "none"}`);
  console.log(
    `approval_families=${result.approvalFamilies.join(",") || "none"}`
  );

  if (!result.satisfied) {
    console.error(
      "::error title=Mixed jury required::Approval must include a provider family " +
        "foreign to the author. Unmapped agent authors require approvals from two mapped families."
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

module.exports = {
  LOGIN_FAMILY,
  authorFamily,
  evaluateMixedJury,
  flattenReviewPages,
  loginFamily
};
