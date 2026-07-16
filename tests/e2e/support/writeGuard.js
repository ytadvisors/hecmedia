/**
 * Guards every mutating e2e test (addComment, donate, login/register/update
 * account). Two independent conditions must both hold before a write is
 * allowed to run — this is a hard code gate, not a convention:
 *
 *   1. E2E_ALLOW_WRITES=1 is set explicitly.
 *   2. The resolved target host is an explicitly recognizable staging host.
 *
 * Production hosts are denied by name, and unknown hosts are denied too. This
 * means an accidental production URL can never become writable merely because
 * somebody set E2E_ALLOW_WRITES=1; the endpoint must also plainly be staging
 * (or an explicitly named local staging harness).
 */
const PRODUCTION_HOSTS = ["prod-wp.hectv.org", "hectv.org", "hecmedia.org"];

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (err) {
    return "";
  }
}

function isProductionHost(url) {
  const hostname = hostnameOf(url);
  return PRODUCTION_HOSTS.includes(hostname);
}

function isStagingHost(url) {
  const hostname = hostnameOf(url);
  if (!hostname || isProductionHost(url)) return false;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /(^|[.-])(staging|stage|development|develop)([.-]|$)/.test(hostname)
  );
}

function writesAllowed(...targetUrls) {
  if (process.env.E2E_ALLOW_WRITES !== "1") return false;
  return targetUrls.length > 0 && targetUrls.every(isStagingHost);
}

module.exports = { writesAllowed, isProductionHost, isStagingHost };
