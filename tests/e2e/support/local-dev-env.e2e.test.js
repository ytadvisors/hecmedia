/**
 * Proves the two properties task #82651 requires of the local MBA Docker WP
 * dev environment wiring:
 *   1. APOLLO_CLIENT_URI / GATSBY_WP_HOST overrides actually redirect the app's
 *      resolved endpoints to the local instance (dev-infra/wordpress/).
 *   2. The write guard cannot be tricked into targeting production even when a
 *      local override is active elsewhere in the environment — each target is
 *      judged on its own URL, not on process-wide "are we in local mode" state.
 */
const LOCAL_GRAPHQL_URI = "http://localhost:8091/graphql";
const LOCAL_REST_HOST = "http://localhost:8091";

describe("local dev environment overrides (task #82651)", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
    jest.resetModules();
  });

  it("resolves config endpoints to the local docker instance when overridden", () => {
    jest.resetModules();
    process.env.APOLLO_CLIENT_URI = LOCAL_GRAPHQL_URI;
    process.env.GATSBY_WP_HOST = LOCAL_REST_HOST;

    // eslint-disable-next-line global-require
    const { GRAPHQL_URI, REST_HOST } = require("./config");
    expect(GRAPHQL_URI).toBe(LOCAL_GRAPHQL_URI);
    expect(REST_HOST).toBe(LOCAL_REST_HOST);
  });

  it("falls back to production defaults when no local override is set", () => {
    jest.resetModules();
    delete process.env.APOLLO_CLIENT_URI;
    delete process.env.GATSBY_WP_HOST;

    // eslint-disable-next-line global-require
    const { GRAPHQL_URI, REST_HOST } = require("./config");
    expect(GRAPHQL_URI).toBe("https://prod-wp.hectv.org/graphql");
    expect(REST_HOST).toBe("https://prod-wp.hectv.org");
  });

  it("treats the local docker instance as writable-when-opted-in, independent of what else is overridden", () => {
    // eslint-disable-next-line global-require
    const {
      isStagingHost,
      isProductionHost,
      writesAllowed
    } = require("./writeGuard");

    expect(isStagingHost(LOCAL_GRAPHQL_URI)).toBe(true);
    expect(isProductionHost(LOCAL_GRAPHQL_URI)).toBe(false);

    process.env.E2E_ALLOW_WRITES = "1";
    expect(writesAllowed(LOCAL_GRAPHQL_URI, LOCAL_REST_HOST)).toBe(true);

    // A write guard call against the real production host must still refuse,
    // even though a local override is also configured in this process.
    expect(
      writesAllowed(LOCAL_GRAPHQL_URI, "https://prod-wp.hectv.org/graphql")
    ).toBe(false);
  });
});
