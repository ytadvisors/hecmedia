jest.mock("@zeit/next-sass", () => config => config);
jest.mock("@zeit/next-css", () => config => config);
jest.mock("dotenv", () => ({
  config: jest.fn(() => ({ parsed: {} }))
}));

const configuredEnvironment = ["APOLLO_CLIENT_URI", "WP_HOST"];
const savedEnvironment = {};

beforeEach(() => {
  configuredEnvironment.forEach(name => {
    savedEnvironment[name] = process.env[name];
  });
  jest.resetModules();
});

afterEach(() => {
  configuredEnvironment.forEach(name => {
    if (savedEnvironment[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnvironment[name];
  });
});

test("inlines the SSR endpoints supplied by the staging build", () => {
  process.env.APOLLO_CLIENT_URI = "https://prod-wp.hectv.org/graphql";
  process.env.WP_HOST = "https://prod-wp.hectv.org";

  const config = require("./next.config");

  expect(config.env).toMatchObject({
    APOLLO_CLIENT_URI: "https://prod-wp.hectv.org/graphql",
    WP_HOST: "https://prod-wp.hectv.org"
  });
});
