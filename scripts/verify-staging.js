#!/usr/bin/env node
const https = require("https");
const { URL } = require("url");

const siteUrl = process.env.STAGING_SITE_URL;
const expectedSha = process.env.DEPLOY_SHA;
const aliases = (process.env.CLOUDFRONT_ALIASES || "").split(",");
const expectedHost = "development.hecmedia.org";
const routes = ["/", "/events", "/about-us"];

function fail(message) {
  throw new Error(message);
}
function assertTarget() {
  const target = new URL(siteUrl);
  if (target.protocol !== "https:" || target.hostname !== expectedHost)
    fail(`Target must be https://${expectedHost}`);
}
function request(route) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      new URL(route, siteUrl),
      { timeout: 30000 },
      response => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", chunk => {
          body += chunk;
        });
        response.on("end", () => resolve({ route, response, body }));
      }
    );
    req.on("timeout", () => req.destroy(new Error(`${route} timed out`)));
    req.on("error", reject);
  });
}
async function main() {
  if (!siteUrl || !expectedSha)
    fail("STAGING_SITE_URL and DEPLOY_SHA are required");
  assertTarget();
  if (
    !aliases.includes(expectedHost) ||
    aliases.some(alias => alias !== expectedHost)
  )
    fail(`CloudFront aliases must contain only ${expectedHost}`);
  const pages = await Promise.all(routes.map(request));
  pages.forEach(({ route, response, body }) => {
    if (response.statusCode !== 200)
      fail(`${route} returned HTTP ${response.statusCode}`);
    if (!/HEC-TV/.test(body))
      fail(`${route} did not render the HEC-TV identity`);
    if (!body.includes(`name="hecmedia-deploy-sha" content="${expectedSha}"`))
      fail(`${route} did not render deploy SHA`);
    if (!body.includes('name="hecmedia-forms-mode" content="true"'))
      fail(`${route} is not in no-send forms mode`);
  });
  console.log(JSON.stringify({ siteUrl, expectedSha, routes, aliases }));
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
