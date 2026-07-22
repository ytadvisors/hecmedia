const {
  authorFamily,
  evaluateMixedJury,
  flattenReviewPages
} = require("./check-jury-diversity");

const review = (login, state = "APPROVED") => ({
  user: { login },
  state
});

test("an OpenAI-authored PR requires an Anthropic approval", () => {
  expect(
    evaluateMixedJury([[review("yt-agent-kronos")]], "yt-agent-tom-gpt")
      .satisfied
  ).toBe(true);
  expect(
    evaluateMixedJury([[review("yt-agent-kronos-gpt")]], "yt-agent-tom-gpt")
      .satisfied
  ).toBe(false);
});

test("an Anthropic-authored PR requires an OpenAI approval", () => {
  expect(
    evaluateMixedJury([[review("yt-agent-kronos-gpt")]], "yt-agent-tom")
      .satisfied
  ).toBe(true);
});

test("the latest standing verdict replaces an earlier approval", () => {
  const result = evaluateMixedJury(
    [
      [
        review("yt-agent-kronos"),
        review("yt-agent-kronos", "CHANGES_REQUESTED")
      ]
    ],
    "yt-agent-tom-gpt"
  );
  expect(result.satisfied).toBe(false);
});

test("an unmapped agent author fails closed until two families approve", () => {
  expect(authorFamily("yt-agent-new-lane")).toBeNull();
  expect(
    evaluateMixedJury([[review("yt-agent-kronos")]], "yt-agent-new-lane")
      .satisfied
  ).toBe(false);
  expect(
    evaluateMixedJury(
      [[review("yt-agent-kronos"), review("yt-agent-kronos-gpt")]],
      "yt-agent-new-lane"
    ).satisfied
  ).toBe(true);
});

test("paged and flat GitHub review responses are both supported", () => {
  expect(flattenReviewPages([[review("a")], [review("b")]])).toHaveLength(2);
  expect(flattenReviewPages([review("a"), review("b")])).toHaveLength(2);
});
