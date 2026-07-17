import serverFunctions, { isServer } from "./serverFunctions";

describe("serverFunctions", () => {
  it("reports false in a jsdom (browser-like) test environment", () => {
    expect(isServer).toBe(false);
  });

  it("exports a no-op default (kept for backwards-compatible imports)", () => {
    expect(serverFunctions()).toBeUndefined();
  });
});
