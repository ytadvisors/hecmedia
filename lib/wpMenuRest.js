/**
 * REST fallback for WordPress nav menus when WPGraphQL hides them.
 *
 * WPGraphQL only exposes menus assigned to a registered theme location.
 * Staging often has classic menus (Footer, Social, BottomNav) that exist in
 * Appearance → Menus but are unassigned — so `menus(where: { slug })` returns
 * empty edges. The open-source `wp-api-menus` plugin still lists those menus
 * publicly on staging (`/wp-json/wp-api-menus/v2/menus`).
 *
 * Shape the REST payload like WPGraphQL menus edges so Footer/Header keep one
 * rendering path. Prefer GraphQL when it has items; call this only as fallback.
 */

import { toSiteRelativeUrl } from "./navUrl";

const DEFAULT_WP_HOST = "https://staging-wp.hectv.org";

export const getWpHost = () => {
  const fromEnv =
    process.env.WP_HOST ||
    process.env.GATSBY_WP_HOST ||
    (process.env.APOLLO_CLIENT_URI
      ? String(process.env.APOLLO_CLIENT_URI).replace(/\/graphql\/?$/, "")
      : "");
  const host = (fromEnv || DEFAULT_WP_HOST).replace(/\/$/, "");
  return host;
};

/**
 * Convert a wp-api-menus menu payload into the GraphQL-shaped connection
 * Footer expects: { edges: [ { node: { menuItems: { edges: [...] } } } ] }
 */
export const restMenuToGraphqlShape = menu => {
  if (!menu || !Array.isArray(menu.items)) {
    return { edges: [] };
  }

  const itemToEdge = item => {
    if (!item || !(item.title || item.label)) return null;
    const label = String(item.title || item.label || "").trim();
    const url = String(item.url || "").trim();
    if (!label || !url) return null;

    // Derive a path for same-site absolute URLs (navUrl prefers path).
    let path = item.object_slug ? `/${item.object_slug}/` : "";
    try {
      if (url.startsWith("http")) {
        const relativeUrl = toSiteRelativeUrl(url);
        // navUrl knows the WordPress host allowlist. External destinations
        // must not receive a site-relative path, or path-first consumers
        // would turn https://facebook.com/hectv into /hectv.
        path =
          relativeUrl.startsWith("/") && !relativeUrl.startsWith("//")
            ? relativeUrl
            : "";
      } else if (url.startsWith("/")) {
        path = url;
      }
    } catch (e) {
      // keep path as derived above
    }

    const rawParent = item.parent;
    const numericParent = Number(rawParent);
    const parentDatabaseId = Number.isFinite(numericParent)
      ? numericParent
      : rawParent || 0;
    const childEdges = (Array.isArray(item.children) ? item.children : [])
      .map(itemToEdge)
      .filter(Boolean);

    return {
      node: {
        databaseId: item.id || item.ID || null,
        label,
        url,
        path,
        parentDatabaseId,
        childItems: { edges: childEdges }
      }
    };
  };

  const itemEdges = menu.items.map(itemToEdge).filter(Boolean);

  if (itemEdges.length === 0) {
    return { edges: [] };
  }

  return {
    edges: [
      {
        node: {
          name: menu.name || "",
          slug: menu.slug || "",
          menuItems: { edges: itemEdges }
        }
      }
    ]
  };
};

/**
 * Fetch a nav menu by slug via wp-api-menus REST.
 * @param {string} slug e.g. "footer", "social"
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{edges: Array}|null>} GraphQL-shaped menu or null on failure
 */
export const fetchMenuBySlug = async (slug, fetchImpl = fetch) => {
  if (!slug || typeof slug !== "string") return null;
  const base = getWpHost();
  const listUrl = `${base}/wp-json/wp-api-menus/v2/menus`;

  try {
    const listRes = await fetchImpl(listUrl);
    if (!listRes || !listRes.ok) return null;
    const menus = await listRes.json();
    if (!Array.isArray(menus)) return null;

    const match = menus.find(
      m => m && String(m.slug || "").toLowerCase() === slug.toLowerCase()
    );
    if (!match) return null;

    const id = match.term_id || match.ID || match.id;
    if (!id) return null;

    const detailRes = await fetchImpl(
      `${base}/wp-json/wp-api-menus/v2/menus/${id}`
    );
    if (!detailRes || !detailRes.ok) return null;
    const detail = await detailRes.json();
    return restMenuToGraphqlShape(detail);
  } catch (err) {
    return null;
  }
};
