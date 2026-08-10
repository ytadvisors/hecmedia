const {
  JOBS,
  classifyJobs,
  executeDecision
} = require("./production-recovery-watchdog");

const releaseSha = "a".repeat(40);

function job(name, conclusion, status = "completed") {
  return { conclusion, name, status };
}

function successfulThrough(phase) {
  const jobs = [];
  if (["mutation", "public", "tag"].includes(phase)) {
    jobs.push(job(JOBS.mutation, "success"));
  }
  if (["public", "tag"].includes(phase)) {
    jobs.push(job(JOBS.publicVerification, "success"));
  }
  if (phase === "tag") jobs.push(job(JOBS.releaseTag, "success"));
  return jobs;
}

test.each([
  ["runner loss after the write fence", JOBS.mutation, "failure"],
  [
    "mutation job timeout during conditional S3 upload",
    JOBS.mutation,
    "timed_out"
  ],
  [
    "workflow cancellation after CloudFront mutation",
    JOBS.mutation,
    "cancelled"
  ],
  ["mutation evidence upload failure", JOBS.mutation, "failure"],
  [
    "credential-free public verification failure",
    JOBS.publicVerification,
    "failure"
  ],
  ["terminal tag step cancellation", JOBS.releaseTag, "cancelled"]
])(
  "routes %s to the independent recovery controller",
  async (label, failedJob, conclusion) => {
    let completedPhase = "tag";
    if (failedJob === JOBS.mutation) completedPhase = "mutation";
    if (failedJob === JOBS.publicVerification) completedPhase = "public";
    const jobs = successfulThrough(completedPhase).filter(
      item => item.name !== failedJob
    );
    jobs.push(job(failedJob, conclusion));
    const decision = classifyJobs(jobs);
    const recover = jest.fn(reason => ({ reason, state: "recovered" }));
    const result = await executeDecision(decision, {
      inspectTag: () => ({ state: "absent-or-not-annotated" }),
      recover,
      releaseSha
    });
    expect(result.state).toBe("recovered");
    expect(recover).toHaveBeenCalledTimes(1);
  }
);

test("waits while each governed phase is genuinely in progress", () => {
  expect(classifyJobs([job(JOBS.mutation, null, "in_progress")])).toMatchObject(
    { phase: "mutation", state: "wait" }
  );
  expect(
    classifyJobs([
      job(JOBS.mutation, "success"),
      job(JOBS.publicVerification, null, "queued")
    ])
  ).toMatchObject({ phase: "public-verification", state: "wait" });
});

test("recovers but preserves an exact annotated tag if the tag runner disappears afterward", async () => {
  const jobs = successfulThrough("public");
  jobs.push(job(JOBS.releaseTag, "failure"));
  const recover = jest.fn(reason => ({ reason, state: "recovered" }));
  const result = await executeDecision(classifyJobs(jobs), {
    inspectTag: () => ({
      releaseSha,
      state: "exact-annotated-release",
      tag: `hecmedia-production-${releaseSha.slice(0, 12)}`
    }),
    recover,
    releaseSha
  });
  expect(result.state).toBe("recovered");
  expect(recover).toHaveBeenCalledWith(
    expect.objectContaining({
      exactTagPreserved: expect.objectContaining({
        state: "exact-annotated-release"
      })
    })
  );
});

test("recovers when a nominally successful tag job did not leave the exact annotated tag", async () => {
  const recover = jest.fn(reason => ({ reason, state: "recovered" }));
  const result = await executeDecision(classifyJobs(successfulThrough("tag")), {
    inspectTag: () => ({ state: "absent-or-not-annotated" }),
    recover,
    releaseSha
  });
  expect(result.state).toBe("recovered");
  expect(recover.mock.calls[0][0]).toMatchObject({
    conclusion: "success-with-invalid-terminal-tag",
    phase: "release-tag"
  });
});
