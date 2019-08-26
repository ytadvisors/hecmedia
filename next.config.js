const withSASS = require("@zeit/next-sass");
const withCSS = require("@zeit/next-css");

const config = {
  target: "serverless",
  assetPrefix: "https://s3.amazonaws.com/live.hecmedia.org"
};

module.exports = withSASS(withCSS(config));
