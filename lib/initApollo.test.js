const mockHttpLinkConcat = jest.fn(() => "combined-link");
const mockAuthLink = { concat: mockHttpLinkConcat };
const mockSetContext = jest.fn(fn => {
  mockAuthLink.contextFn = fn;
  return mockAuthLink;
});

jest.mock("apollo-client", () => ({
  ApolloClient: jest.fn(config => ({ __config: config }))
}));
jest.mock("apollo-cache-inmemory", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  InMemoryCache: jest.fn(function InMemoryCache() {
    this.restore = jest.fn(state => ({ __restoredFrom: state }));
  })
}));
jest.mock("apollo-link", () => ({
  ApolloLink: { from: jest.fn(links => ({ __links: links })) }
}));
jest.mock("apollo-link-retry", () => ({
  RetryLink: jest.fn(() => {})
}));
jest.mock("apollo-link-http", () => ({
  createHttpLink: jest.fn(config => ({ __httpLinkConfig: config }))
}));
jest.mock("apollo-link-context", () => ({ setContext: mockSetContext }));
jest.mock("js-cookie", () => ({ get: jest.fn() }));
jest.mock("isomorphic-unfetch", () => "fetch-polyfill");

describe("initApollo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("reuses a single client across calls in the browser", () => {
    const initApollo = require("./initApollo").default;
    const { ApolloClient } = require("apollo-client");

    const first = initApollo();
    const second = initApollo();

    expect(first).toBe(second);
    expect(ApolloClient).toHaveBeenCalledTimes(1);
  });

  it("attaches a bearer token from the cookie on the client", () => {
    // resetModules() gives initApollo.js a fresh copy of js-cookie, so the
    // mock must be configured on that same fresh copy, not the top-level import.
    const FreshCookies = require("js-cookie");
    FreshCookies.get.mockReturnValue("my-token");
    const initApollo = require("./initApollo").default;

    initApollo();

    const headers = mockAuthLink.contextFn({}, { headers: {} });
    expect(headers.headers.authorization).toBe("Bearer my-token");
  });

  it("sends no authorization header when there is no cookie token", () => {
    const FreshCookies = require("js-cookie");
    FreshCookies.get.mockReturnValue(undefined);
    const initApollo = require("./initApollo").default;

    initApollo();

    const headers = mockAuthLink.contextFn({}, { headers: {} });
    expect(headers.headers.authorization).toBe("");
  });

  it("creates a fresh client per call on the server (no window)", () => {
    const originalWindow = global.window;
    delete global.window;

    const initApollo = require("./initApollo").default;
    const { ApolloClient } = require("apollo-client");

    initApollo();
    initApollo();

    expect(ApolloClient).toHaveBeenCalledTimes(2);

    global.window = originalWindow;
  });
});
