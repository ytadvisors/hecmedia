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
  target: "serverless",
  env: localEnv,
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
