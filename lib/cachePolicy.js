// Editorial updates should be visible on the next request cycle. Keep a tiny
// shared-cache window for request coalescing, but do not serve stale HTML.
const ANONYMOUS_HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=5, must-revalidate";

module.exports = {
  ANONYMOUS_HTML_CACHE_CONTROL
};
