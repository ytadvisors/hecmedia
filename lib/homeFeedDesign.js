/**
 * Home page feed layout helpers.
 *
 * WPGraphQL Page.feedDesign must expose ACF "Feed Design" → new_row_layout
 * (Featured / 3 Columns / Single Column rows). Staging's owned resolver
 * historically only read a seed JSON key (`feed_design_rows`), so GraphQL
 * returned empty newRowLayout and ListOfPosts fell back to a single display
 * type. Prefer GraphQL; when rows are empty, hydrate from the public WP REST
 * ACF payload which already has the correct repeater.
 */

import { getWpHost } from "./wpMenuRest";

/**
 * Classic Home page row layouts (matches production/staging ACF Feed Design).
 * Used when GraphQL returns empty newRowLayout so the homepage still renders
 * Featured / multi-column blocks instead of a single Single-Column stack.
 */
export const DEFAULT_HOME_FEED_DESIGN = {
  newRowLayout: [
    { rowLayout: "Featured", displayType: "Post" },
    { rowLayout: "3 Columns", displayType: "Post" },
    { rowLayout: "Single Column", displayType: "Post" },
    { rowLayout: "Single Column", displayType: "Post" },
    { rowLayout: "Featured", displayType: "Post" },
    { rowLayout: "Single Column", displayType: "Post" }
  ],
  defaultDisplayType: "Post",
  defaultRowLayout: "Single Column"
};

export const hasFeedRowLayout = feedDesign =>
  !!(
    feedDesign &&
    Array.isArray(feedDesign.newRowLayout) &&
    feedDesign.newRowLayout.length > 0
  );

/**
 * Map REST ACF feed fields → GraphQL feedDesign shape.
 */
export const acfToFeedDesign = acf => {
  const raw = acf || {};
  const rows = Array.isArray(raw.new_row_layout) ? raw.new_row_layout : [];
  const newRowLayout = rows
    .map(row => {
      if (!row || typeof row !== "object") return null;
      const rowLayout = row.row_layout || row.rowLayout;
      const displayType = row.display_type || row.displayType;
      if (!rowLayout && !displayType) return null;
      return {
        rowLayout: String(rowLayout || "Single Column"),
        displayType: String(displayType || "Post")
      };
    })
    .filter(Boolean);

  return {
    newRowLayout,
    defaultDisplayType: String(
      raw.default_display_type || raw.defaultDisplayType || "Post"
    ),
    defaultRowLayout: String(
      raw.default_row_layout || raw.defaultRowLayout || "Single Column"
    )
  };
};

/**
 * Extract ordered required post IDs from REST ACF post_list repeater.
 */
export const acfRequiredPostIds = acf => {
  const list = acf && Array.isArray(acf.post_list) ? acf.post_list : [];
  const ids = [];
  list.forEach(row => {
    const post = row && typeof row === "object" ? row.post : row;
    if (!post) return;
    if (typeof post === "number") {
      ids.push(post);
      return;
    }
    if (typeof post === "object") {
      const id = post.ID || post.id || post.databaseId;
      if (id) ids.push(Number(id));
    }
  });
  return ids.filter(Number.isFinite);
};

/**
 * Fetch home (or other) page ACF via public REST and return
 * { feedDesign, requiredPostIds } or null.
 */
export const fetchPageAcfLayout = async (slug = "home", fetchImpl = fetch) => {
  if (!slug) return null;
  const base = getWpHost();
  const url = `${base}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`;
  try {
    const res = await fetchImpl(url);
    if (!res || !res.ok) return null;
    const pages = await res.json();
    if (!Array.isArray(pages) || pages.length === 0) return null;
    const acf = pages[0].acf || {};
    return {
      feedDesign: acfToFeedDesign(acf),
      requiredPostIds: acfRequiredPostIds(acf)
    };
  } catch (err) {
    return null;
  }
};

/**
 * Prefer GraphQL feedDesign when it has rows; else REST; else classic Home defaults.
 */
export const resolveFeedDesign = (graphqlDesign, restDesign) => {
  if (hasFeedRowLayout(graphqlDesign)) return graphqlDesign;
  if (hasFeedRowLayout(restDesign)) return restDesign;
  if (hasFeedRowLayout(DEFAULT_HOME_FEED_DESIGN)) {
    return DEFAULT_HOME_FEED_DESIGN;
  }
  return (
    graphqlDesign ||
    restDesign || {
      newRowLayout: [],
      defaultDisplayType: "Post",
      defaultRowLayout: "Single Column"
    }
  );
};
