const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");
const { parsed: localEnv } = require("dotenv").config({ silent: true });

const config = {
  target: "serverless",
  assetPrefix: "https://s3.amazonaws.com/live.hecmedia.org",
  env: localEnv
};

module.exports = withSASS(withCSS(config));
