const envFile = process.env.ACTIVE_ENV
  ? `.env.${process.env.ACTIVE_ENV}`
  : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const serverOnlyEnvironment = [
  "HECTV_NEWSLETTER_ENDPOINT",
  "HECTV_NEWSLETTER_SHARED_SECRET",
  "HECTV_RECAPTCHA_SECRET_KEY",
  "RE_CAPTCHA_SECRET_KEY"
];
const clientLocalEnv = Object.keys(localEnv || {}).reduce(
  (values, name) =>
    serverOnlyEnvironment.includes(name)
      ? values
      : { ...values, [name]: localEnv[name] },
  {}
);

const disableImageOptimizer =
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER === "true";

const config = {
  ...(disableImageOptimizer ? { images: { loader: "akamai", path: "" } } : {}),
  env: {
    ...clientLocalEnv,
    DEPLOY_SHA: process.env.DEPLOY_SHA,
    APOLLO_CLIENT_URI: process.env.APOLLO_CLIENT_URI,
    WP_HOST: process.env.WP_HOST,
    HECMEDIA_NO_SEND_FORMS: process.env.HECMEDIA_NO_SEND_FORMS,
    HECMEDIA_MODERN_WPGRAPHQL: process.env.HECMEDIA_MODERN_WPGRAPHQL,
    HECMEDIA_TOPBAR_CTAS_JSON: process.env.HECMEDIA_TOPBAR_CTAS_JSON,
    RE_CAPTCHA_SITE_KEY: process.env.RE_CAPTCHA_SITE_KEY
  }
};

module.exports = config;
