/**
 * Permanent post slug redirects for HEC Media public URLs.
 *
 * When editors rename a published post slug in WordPress, the headless
 * frontend keeps serving the old path as a soft-empty page unless we map it.
 * Keep destinations as site-absolute paths (no host) so redirects work on
 * hecmedia.org and www.hecmedia.org.
 *
 * Keys are the WordPress/post slug segment under /posts/ (no leading slash).
 */
const POST_SLUG_REDIRECTS = Object.freeze({
  // Tim (HEC) 2026-08: Educate.Today resources post renamed in WP admin.
  // Old: /posts/educate-today-video-resources-for-classroom-and-homeschool
  // New: /posts/for-educators
  "educate-today-video-resources-for-classroom-and-homeschool":
    "/posts/for-educators"
});

/**
 * @param {string|string[]|undefined|null} slug
 * @returns {string|null} absolute path destination, or null when no redirect
 */
function resolvePostSlugRedirect(slug) {
  if (slug == null) return null;
  const raw = Array.isArray(slug) ? slug[0] : slug;
  if (typeof raw !== "string") return null;
  const normalized = raw
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  if (!normalized) return null;
  return POST_SLUG_REDIRECTS[normalized] || null;
}

/**
 * Next.js `redirects()` entries with an explicit permanent 301.
 * @returns {Array<{source: string, destination: string, statusCode: number}>}
 */
function postSlugRedirectRules() {
  return Object.keys(POST_SLUG_REDIRECTS).map(fromSlug => ({
    source: `/posts/${fromSlug}`,
    destination: POST_SLUG_REDIRECTS[fromSlug],
    statusCode: 301
  }));
}

module.exports = {
  POST_SLUG_REDIRECTS,
  resolvePostSlugRedirect,
  postSlugRedirectRules
};
