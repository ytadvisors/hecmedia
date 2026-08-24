jest.mock("dotenv", () => ({
  config: jest.fn(() => ({ parsed: {} }))
}));

const configuredEnvironment = [
  "APOLLO_CLIENT_URI",
  "WP_HOST",
  "GATSBY_WP_HOST",
  "HECTV_NEWSLETTER_ENDPOINT",
  "HECTV_NEWSLETTER_SHARED_SECRET",
  "HECTV_RECAPTCHA_SECRET_KEY",
  "HECMEDIA_MODERN_WPGRAPHQL",
  "HECMEDIA_TOPBAR_CTAS_JSON",
  "HECMEDIA_DISABLE_IMAGE_OPTIMIZER",
  "HECMEDIA_NEWSLETTER_EXPORT",
  "RE_CAPTCHA_SECRET_KEY",
  "RE_CAPTCHA_SITE_KEY",
  "GA_TAGMANAGER_ID"
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

test("inlines the legacy public WordPress host used by media fallbacks", () => {
  process.env.GATSBY_WP_HOST = "https://prod-wp.hectv.org";

  const config = require("./next.config");

  expect(config.env.GATSBY_WP_HOST).toBe("https://prod-wp.hectv.org");
});

test("inlines the staging reCAPTCHA site key for the newsletter preview", () => {
  process.env.RE_CAPTCHA_SITE_KEY = "staging-site-key";

  const config = require("./next.config");

  expect(config.env.RE_CAPTCHA_SITE_KEY).toBe("staging-site-key");
});

test("inlines the public GTM container id for TagManager", () => {
  process.env.GA_TAGMANAGER_ID = "GTM-57RZPNN";

  const config = require("./next.config");

  expect(config.env.GA_TAGMANAGER_ID).toBe("GTM-57RZPNN");
});

test("never inlines newsletter or CAPTCHA server credentials", () => {
  const dotenv = require("dotenv");
  dotenv.config.mockReturnValueOnce({
    parsed: {
      HECTV_NEWSLETTER_ENDPOINT: "https://private-origin.example/newsletter",
      HECTV_NEWSLETTER_SHARED_SECRET: "must-not-reach-the-browser",
      HECTV_RECAPTCHA_SECRET_KEY: "wordpress-only-secret",
      RE_CAPTCHA_SECRET_KEY: "must-also-stay-server-only",
      SAFE_CLIENT_VALUE: "visible"
    }
  });
  process.env.HECTV_NEWSLETTER_ENDPOINT =
    "https://private-origin.example/newsletter";
  process.env.HECTV_NEWSLETTER_SHARED_SECRET = "must-not-reach-the-browser";
  process.env.HECTV_RECAPTCHA_SECRET_KEY = "wordpress-only-secret";
  process.env.RE_CAPTCHA_SECRET_KEY = "must-also-stay-server-only";

  const config = require("./next.config");

  expect(config.env.SAFE_CLIENT_VALUE).toBe("visible");
  expect(config.env).not.toHaveProperty("HECTV_NEWSLETTER_ENDPOINT");
  expect(config.env).not.toHaveProperty("HECTV_NEWSLETTER_SHARED_SECRET");
  expect(config.env).not.toHaveProperty("HECTV_RECAPTCHA_SECRET_KEY");
  expect(config.env).not.toHaveProperty("RE_CAPTCHA_SECRET_KEY");
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

test("advertises anonymous homepage edge cache headers", async () => {
  const { ANONYMOUS_HTML_CACHE_CONTROL } = require("./lib/cachePolicy");
  const config = require("./next.config");
  const rules = await config.headers();
  expect(rules).toEqual([
    {
      source: "/",
      headers: [
        {
          key: "Cache-Control",
          value: ANONYMOUS_HTML_CACHE_CONTROL
        }
      ]
    }
  ]);
  expect(ANONYMOUS_HTML_CACHE_CONTROL).toBe(
    "public, max-age=0, s-maxage=5, must-revalidate"
  );
});

test("keeps the default image loader outside the staging build", () => {
  delete process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER;

  const config = require("./next.config");

  expect(config).not.toHaveProperty("images");
});

test("exports only the two newsletter pages for the scoped production release", async () => {
  process.env.HECMEDIA_NEWSLETTER_EXPORT = "true";
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER = "true";

  const config = require("./next.config");

  expect(await config.exportPathMap()).toEqual({
    "/newsletter": { page: "/newsletter" },
    "/newsletter/thank-you": { page: "/newsletter/thank-you" }
  });
  expect(config.images).toEqual({ loader: "akamai", path: "" });
});

test("does not alter the normal route map unless newsletter export is explicit", () => {
  const config = require("./next.config");

  expect(config).not.toHaveProperty("exportPathMap");
});
