// Published WordPress changes purge CloudFront immediately. Five minutes is
// the bounded fallback when an invalidation cannot be submitted; browsers do
// not retain the response and CloudFront must not serve it beyond that window.
const ANONYMOUS_HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, must-revalidate";

module.exports = {
  ANONYMOUS_HTML_CACHE_CONTROL
};
