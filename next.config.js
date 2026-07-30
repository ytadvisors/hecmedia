const envFile = process.env.ACTIVE_ENV
  ? `.env.${process.env.ACTIVE_ENV}`
  : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const disableImageOptimizer =
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER === "true";

const exposedEnv = Object.fromEntries(
  [
    "DEPLOY_SHA",
    "APOLLO_CLIENT_URI",
    "WP_HOST",
    "HECMEDIA_NO_SEND_FORMS",
    "HECMEDIA_MODERN_WPGRAPHQL",
    "HECMEDIA_TOPBAR_CTAS_JSON",
    "RE_CAPTCHA_SITE_KEY"
  ]
    .map(name => [name, process.env[name]])
    .filter(([, value]) => typeof value === "string")
);

const config = {
  ...(disableImageOptimizer ? { images: { loader: "akamai", path: "" } } : {}),
  env: {
    ...localEnv,
    ...exposedEnv
  }
};

module.exports = config;
