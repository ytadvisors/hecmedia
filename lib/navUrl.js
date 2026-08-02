/**
 * Convert WordPress / GraphQL navigation URLs into site-relative paths for the
 * Next.js app. Modern WPGraphQL returns absolute menu URLs on the WP host
 * (e.g. https://staging-wp.hectv.org/category/arts/); the SPA must navigate
 * locally as /category/arts/ instead of leaving for the WP origin.
 */

const KNOWN_WP_HOSTS = new Set([
  "staging-wp.hectv.org",
  "prod-wp.hectv.org",
  "prod-wp-ecs.hectv.org",
  "hectv.org",
  "www.hectv.org",
  "hecmedia.org",
  "www.hecmedia.org",
  "development.hecmedia.org",
  "127.0.0.1",
  "localhost"
]);

const isKnownWpHost = hostname => {
  if (!hostname) return false;
  const host = String(hostname)
    .toLowerCase()
    .replace(/\.$/, "");
  if (KNOWN_WP_HOSTS.has(host)) return true;
  // Allow any local tunnel host:port form already covered by hostname alone.
  return false;
};

/**
 * @param {string|null|undefined} urlOrPath Absolute WP URL, relative path, or empty.
 * @returns {string} Site-relative path (keeps query/hash). External non-WP URLs unchanged.
 */
export const toSiteRelativeUrl = urlOrPath => {
  if (urlOrPath == null) return "/";
  const raw = String(urlOrPath).trim();
  if (!raw) return "/";

  // Already site-relative.
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  // Protocol-relative external (//cdn.example.com/...) — leave alone.
  if (raw.startsWith("//")) {
    try {
      const u = new URL(`https:${raw}`);
      if (isKnownWpHost(u.hostname)) {
        return `${u.pathname || "/"}${u.search}${u.hash}` || "/";
      }
    } catch (e) {
      /* keep raw */
    }
    return raw;
  }

  try {
    const u = new URL(raw);
    if (!isKnownWpHost(u.hostname)) {
      // External absolute (social networks, etc.)
      return raw;
    }
    const path = u.pathname || "/";
    return `${path}${u.search}${u.hash}` || "/";
  } catch (e) {
    // Not a valid absolute URL — treat as opaque path fragment.
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
};

/**
 * Prefer GraphQL `path` (already relative) then fall back to `url`.
 * @param {{ path?: string, url?: string }|null|undefined} node
 */
export const menuNodeToRelativeUrl = node => {
  if (!node) return "/";
  if (node.path && String(node.path).trim()) {
    return toSiteRelativeUrl(node.path);
  }
  return toSiteRelativeUrl(node.url);
};

export default toSiteRelativeUrl;
