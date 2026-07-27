const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");

const envFile = process.env.ACTIVE_ENV
  ? `.env.${process.env.ACTIVE_ENV}`
  : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const disableImageOptimizer =
  process.env.HECMEDIA_DISABLE_IMAGE_OPTIMIZER === "true";

const config = {
  target: "experimental-serverless-trace",
  ...(disableImageOptimizer ? { images: { loader: "akamai", path: "" } } : {}),
  env: {
    ...localEnv,
    DEPLOY_SHA: process.env.DEPLOY_SHA,
    APOLLO_CLIENT_URI: process.env.APOLLO_CLIENT_URI,
    WP_HOST: process.env.WP_HOST,
    HECMEDIA_NO_SEND_FORMS: process.env.HECMEDIA_NO_SEND_FORMS,
    HECMEDIA_MODERN_WPGRAPHQL: process.env.HECMEDIA_MODERN_WPGRAPHQL,
    HECMEDIA_TOPBAR_CTAS_JSON: process.env.HECMEDIA_TOPBAR_CTAS_JSON,
    RE_CAPTCHA_SITE_KEY: process.env.RE_CAPTCHA_SITE_KEY
  },
  webpack: data => {
    const conf = { ...data };
    conf.node = {
      fs: "empty"
    };
    if (process.env.NODE_ENV === "production")
      conf.optimization.minimize = true;
    return conf;
  }
};

module.exports = withSASS(withCSS(config));
