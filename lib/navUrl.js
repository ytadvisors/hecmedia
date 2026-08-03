/**
 * Convert WordPress / GraphQL navigation URLs into app navigation targets.
 *
 * Internal hosts (hectv.org, hecmedia.org, staging/prod WP, local) → strip the
 * origin and route in-app with the path only.
 *
 * Every other absolute URL → keep full href and open externally.
 */

const KNOWN_INTERNAL_HOSTS = new Set([
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

/**
 * @param {string|null|undefined} hostname
 * @returns {boolean}
 */
export const isKnownInternalHost = hostname => {
  if (!hostname) return false;
  const host = String(hostname)
    .toLowerCase()
    .replace(/\.$/, "");
  return KNOWN_INTERNAL_HOSTS.has(host);
};

// Back-compat alias used by older call sites / docs.
export const isKnownWpHost = isKnownInternalHost;

/**
 * @param {string|null|undefined} href
 * @returns {boolean}
 */
export const isSiteRelativePath = href =>
  typeof href === "string" && href.startsWith("/") && !href.startsWith("//");

/**
 * @param {string|null|undefined} urlOrPath
 * @returns {boolean} True when the destination must leave the SPA.
 */
export const isExternalNavUrl = urlOrPath => {
  if (urlOrPath == null) return false;
  const raw = String(urlOrPath).trim();
  if (!raw || isSiteRelativePath(raw)) return false;

  if (raw.startsWith("//")) {
    try {
      return !isKnownInternalHost(new URL(`https:${raw}`).hostname);
    } catch (e) {
      return true;
    }
  }

  try {
    const u = new URL(raw);
    // Only http(s) absolute URLs are treated as external destinations.
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return !isKnownInternalHost(u.hostname);
  } catch (e) {
    return false;
  }
};

/**
 * Resolve a menu / CTA URL into an href the app can render.
 *
 * @param {string|null|undefined} urlOrPath Absolute WP/site URL, relative path, or empty.
 * @returns {{ href: string, external: boolean }}
 *   - internal → `{ href: "/path?…#…", external: false }` (origin stripped)
 *   - external → `{ href: "https://…", external: true }` (full absolute URL)
 */
export const resolveNavUrl = urlOrPath => {
  if (urlOrPath == null) return { href: "/", external: false };
  const raw = String(urlOrPath).trim();
  if (!raw) return { href: "/", external: false };

  // Already site-relative.
  if (isSiteRelativePath(raw)) {
    return { href: raw, external: false };
  }

  // Protocol-relative.
  if (raw.startsWith("//")) {
    try {
      const u = new URL(`https:${raw}`);
      if (isKnownInternalHost(u.hostname)) {
        const path = `${u.pathname || "/"}${u.search}${u.hash}` || "/";
        return { href: path, external: false };
      }
      return { href: `https:${raw}`, external: true };
    } catch (e) {
      return { href: raw, external: true };
    }
  }

  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      // e.g. mailto:, tel: — treat as external absolute, leave alone.
      return { href: raw, external: true };
    }
    if (!isKnownInternalHost(u.hostname)) {
      return { href: raw, external: true };
    }
    const path = `${u.pathname || "/"}${u.search}${u.hash}` || "/";
    return { href: path, external: false };
  } catch (e) {
    // Not a valid absolute URL — treat as opaque path fragment.
    const href = raw.startsWith("/") ? raw : `/${raw}`;
    return { href, external: false };
  }
};

/**
 * @param {string|null|undefined} urlOrPath Absolute WP URL, relative path, or empty.
 * @returns {string} Site-relative path for internal hosts; full absolute URL for external.
 */
export const toSiteRelativeUrl = urlOrPath => resolveNavUrl(urlOrPath).href;

/**
 * Prefer GraphQL `url` when it is absolute (authoritative for custom links).
 * WPGraphQL often mirrors custom-link absolutes into `path` as well, but path
 * can also be a misleading site path — absolute `url` always wins.
 *
 * @param {{ path?: string, url?: string }|null|undefined} node
 * @returns {string}
 */
export const menuNodeToRelativeUrl = node => {
  if (!node) return "/";
  const url = node.url != null ? String(node.url).trim() : "";
  const path = node.path != null ? String(node.path).trim() : "";

  if (url && (/^https?:\/\//i.test(url) || url.startsWith("//"))) {
    return toSiteRelativeUrl(url);
  }
  if (path && (/^https?:\/\//i.test(path) || path.startsWith("//"))) {
    return toSiteRelativeUrl(path);
  }
  if (path) return toSiteRelativeUrl(path);
  return toSiteRelativeUrl(url);
};

/**
 * Same preference rules as menuNodeToRelativeUrl, with external flag.
 *
 * @param {{ path?: string, url?: string }|null|undefined} node
 * @returns {{ href: string, external: boolean }}
 */
export const menuNodeToNavUrl = node => {
  if (!node) return { href: "/", external: false };
  const url = node.url != null ? String(node.url).trim() : "";
  const path = node.path != null ? String(node.path).trim() : "";

  if (url && (/^https?:\/\//i.test(url) || url.startsWith("//"))) {
    return resolveNavUrl(url);
  }
  if (path && (/^https?:\/\//i.test(path) || path.startsWith("//"))) {
    return resolveNavUrl(path);
  }
  if (path) return resolveNavUrl(path);
  return resolveNavUrl(url);
};

export default toSiteRelativeUrl;
