const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");

const { ACTIVE_ENV } = process.env;
const envFile = ACTIVE_ENV ? `.env.${ACTIVE_ENV}` : ".env";
const { parsed: localEnv } = require("dotenv").config({
  silent: true,
  path: envFile
});

const { CDN_URL } = process.env;

const config = {
  target: "serverless",
  env: localEnv,
  webpack: data => {
    const { ...conf } = data;
    conf.node = {
      fs: "empty"
    };
    return conf;
  }
};

if (CDN_URL) config.assetPrefix = CDN_URL;

module.exports = withCSS(withSASS(config));
