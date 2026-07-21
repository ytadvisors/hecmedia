const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");

const envFile = process.env.ACTIVE_ENV
  ? `.env.${process.env.ACTIVE_ENV}`
  : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const config = {
  target: "experimental-serverless-trace",
  env: {
    ...localEnv,
    DEPLOY_SHA: process.env.DEPLOY_SHA,
    APOLLO_CLIENT_URI: process.env.APOLLO_CLIENT_URI,
    WP_HOST: process.env.WP_HOST,
    HECMEDIA_NO_SEND_FORMS: process.env.HECMEDIA_NO_SEND_FORMS,
    HECMEDIA_NAVIGATION_PREVIEW: process.env.HECMEDIA_NAVIGATION_PREVIEW,
    HECMEDIA_TOPBAR_CTA_PREVIEW: process.env.HECMEDIA_TOPBAR_CTA_PREVIEW
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
