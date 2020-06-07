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
  env: localEnv,
  webpack: data => {
    const conf = { ...data };
    conf.node = {
      fs: "empty"
    };
    return conf;
  }
};

module.exports = withSASS(withCSS(config));
