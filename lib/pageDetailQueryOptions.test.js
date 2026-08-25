import pageDetailQueryOptions from "./pageDetailQueryOptions";

describe("pageDetailQueryOptions", () => {
  it("does not trust a browser-session page after client-side navigation", () => {
    expect(pageDetailQueryOptions("about-us")).toEqual({
      variables: { uri: "about-us" },
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true
    });
  });
});
