const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export const LOCAL_TEST_CAPTCHA_TOKEN = "hecmedia-local-test-only";

export function isNewsletterLocalTestMode() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.HECMEDIA_NEWSLETTER_LOCAL_TEST === "true"
  );
}

function requestHostname(req) {
  const host = req && req.headers && req.headers.host;
  if (typeof host !== "string" || !host.trim()) return "";

  try {
    return new URL(`http://${host}`).hostname.toLowerCase();
  } catch (err) {
    return "";
  }
}

export function isNewsletterLocalTestRequest(req) {
  return (
    isNewsletterLocalTestMode() && LOOPBACK_HOSTNAMES.has(requestHostname(req))
  );
}
