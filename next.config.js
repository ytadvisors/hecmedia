const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");

const { ACTIVE_ENV } = process.env;
const envFile = ACTIVE_ENV ? `.env.${ACTIVE_ENV}` : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const { CDN } = process.env;

const config = {
  target: "serverless",
  assetPrefix: `https://s3.amazonaws.com/${CDN}`,
  env: localEnv
};

module.exports = withSASS(withCSS(config));
