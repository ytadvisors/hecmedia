jest.mock("dotenv", () => ({
  config: jest.fn(() => ({ parsed: {} }))
}));

const configuredEnvironment = [
  "APOLLO_CLIENT_URI",
  "WP_HOST",
  "HECMEDIA_MODERN_WPGRAPHQL",
  "HECMEDIA_TOPBAR_CTAS_JSON",
  "HECMEDIA_DISABLE_IMAGE_OPTIMIZER",
  "RE_CAPTCHA_SITE_KEY"
];
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

test("inlines the staging reCAPTCHA site key for the newsletter preview", () => {
  process.env.RE_CAPTCHA_SITE_KEY = "staging-site-key";

  const config = require("./next.config");

  expect(config.env.RE_CAPTCHA_SITE_KEY).toBe("staging-site-key");
});

test("inlines the CMS compatibility flags and configurable relative CTAs", () => {
  process.env.HECMEDIA_MODERN_WPGRAPHQL = "false";
  process.env.HECMEDIA_TOPBAR_CTAS_JSON =
    '[{"label":"Subscribe","url":"/subscribe"}]';

  const config = require("./next.config");

  expect(config.env.HECMEDIA_MODERN_WPGRAPHQL).toBe("false");
  expect(config.env.HECMEDIA_TOPBAR_CTAS_JSON).toContain("/subscribe");
});

test("disables the unused image optimizer only for the staging build", () => {
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = "true";

  const config = require("./next.config");

  expect(config.images).toEqual({ loader: "akamai", path: "" });
});

test("keeps the default image loader outside the staging build", () => {
  delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;

  const config = require("./next.config");

  expect(config).not.toHaveProperty("images");
});
