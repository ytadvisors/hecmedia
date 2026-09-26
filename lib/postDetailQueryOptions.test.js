import postDetailQueryOptions from "./postDetailQueryOptions";

describe("postDetailQueryOptions", () => {
  it("does not trust a browser-session post after client-side navigation", () => {
    expect(postDetailQueryOptions("who-else-loves-history")).toEqual({
      variables: { slug: "who-else-loves-history" },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true
    });
  });
});
