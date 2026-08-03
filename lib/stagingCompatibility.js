import { menuNodeToNavUrl, resolveNavUrl } from "./navUrl";

const DEFAULT_TOPBAR_CTAS = [
  { label: "Subscribe", url: "/newsletter", style: "primary" },
  { label: "Support", url: "/support", style: "secondary" }
];

export const modernWpGraphqlEnabled = () =>
  process.env.HECMEDIA_MODERN_WPGRAPHQL !== "false";

const isRelativeLink = value =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

export const getFallbackTopbarCtas = () => {
  const configured = process.env.HECMEDIA_TOPBAR_CTAS_JSON;
  if (!configured) return DEFAULT_TOPBAR_CTAS;

  try {
    const parsed = JSON.parse(configured);
    if (!Array.isArray(parsed)) return DEFAULT_TOPBAR_CTAS;

    // Env-configured CTAs stay in-app only (relative paths after host strip).
    // True external destinations come from WP menus, not this env fallback.
    const valid = parsed
      .filter(
        cta =>
          cta &&
          typeof cta.label === "string" &&
          cta.label.trim() &&
          typeof cta.url === "string" &&
          cta.url.trim()
      )
      .map(cta => {
        const { href, external } = resolveNavUrl(cta.url);
        if (external || !isRelativeLink(href)) return null;
        return {
          label: cta.label.trim(),
          url: href,
          style: cta.style || "secondary"
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return valid.length > 0 ? valid : DEFAULT_TOPBAR_CTAS;
  } catch (error) {
    return DEFAULT_TOPBAR_CTAS;
  }
};

const CTA_STYLES = new Set(["primary", "secondary", "tertiary"]);

/**
 * Map WPGraphQL HEADER_ACTIONS menu items → Header topbarCtas shape.
 * Style is taken from the first cssClasses entry when it is primary|secondary|tertiary.
 *
 * hectv.org / hecmedia.org / WP hosts → path-only (in-app). Other hosts keep the
 * absolute URL so Header can open them externally.
 */
export const topbarCtasFromHeaderActionsMenu = menuConnection => {
  const edges =
    menuConnection && Array.isArray(menuConnection.edges)
      ? menuConnection.edges
      : [];

  const ctas = edges
    .map(({ node }) => node)
    .filter(
      node =>
        node &&
        typeof node.label === "string" &&
        node.label.trim() &&
        Number(node.parentDatabaseId || 0) === 0
    )
    .map(node => {
      const { href, external } = menuNodeToNavUrl(node);
      if (!href) return null;
      if (!isRelativeLink(href) && !external) return null;

      const classes = Array.isArray(node.cssClasses) ? node.cssClasses : [];
      const styleClass = classes
        .map(c => String(c || "").toLowerCase())
        .find(c => CTA_STYLES.has(c));

      return {
        label: node.label.trim(),
        url: href,
        style: styleClass || "secondary"
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  return ctas;
};

export const DEFAULT_RAIL_PROMO = {
  image: {
    sourceUrl:
      "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/3ca97ec68430409a-For-Educators.jpg",
    altText: "For Educators"
  },
  url: "/category/education",
  alt: "For Educators"
};

/**
 * Classic Appearance → Menus → Footer items (staging import). Used as the
 * Footer column fallback when GraphQL has no assigned footer menu and REST
 * has not loaded yet. Distinct from siteContent.footerLinks (BottomNav rail).
 */
export const DEFAULT_FOOTER_MENU_LINKS = [
  { label: "Home", url: "/" },
  { label: "About Us", url: "/about-us" },
  { label: "Contact Us", url: "/contact-us" },
  { label: "Terms of Use", url: "/terms-of-use" },
  { label: "Magazines", url: "/magazines" },
  { label: "Articles", url: "/articles" },
  { label: "Events", url: "/events" },
  { label: "Happening Now", url: "/category/happening-now" }
];

/** Default when Settings → HEC Site Settings has not been saved (matches WP). */
export const DEFAULT_TRENDING_MAX_VIDEOS = 5;

/** Hard ceiling so a bad CMS value cannot request unbounded GraphQL pages. */
export const TRENDING_MAX_VIDEOS_CEILING = 20;

export const DEFAULT_SITE_CONTENT = {
  forEducators: {
    imageUrl: DEFAULT_RAIL_PROMO.image.sourceUrl,
    destinationUrl: DEFAULT_RAIL_PROMO.url,
    label: DEFAULT_RAIL_PROMO.alt
  },
  trendingPostIds: [],
  maxVideos: DEFAULT_TRENDING_MAX_VIDEOS,
  spotlightTitle: "Spotlight STL",
  // BottomNav "more from" rail — not the full site footer.
  footerLinks: [
    { label: "Arts", url: "/category/arts" },
    { label: "Education", url: "/category/education" },
    { label: "Business", url: "/category/business" }
  ]
};

/**
 * Settings → HEC Site Settings → Max videos to show.
 * Accepts trendingSettings.maxVideos or a bare number.
 */
export const normalizeMaxVideos = value => {
  const raw =
    value && typeof value === "object" && "maxVideos" in value
      ? value.maxVideos
      : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TRENDING_MAX_VIDEOS;
  return Math.min(Math.floor(n), TRENDING_MAX_VIDEOS_CEILING);
};

const toRelativeHref = value => {
  if (typeof value !== "string" || !value.trim()) return "";
  const href = value.trim();
  if (isRelativeLink(href)) return href;
  if (href.includes("://")) {
    try {
      const parsed = new URL(href);
      return `${parsed.pathname || "/"}${parsed.search || ""}${parsed.hash ||
        ""}`;
    } catch (e) {
      return "";
    }
  }
  return "";
};

/**
 * Canonical RootQuery.forEducators from Settings → HEC Site Settings.
 * Shape: { label, url, image { sourceUrl, mediaItemUrl, altText } }
 *
 * When `fallback` is provided (e.g. already-normalized legacy hectvSiteContent),
 * missing/null canonical fields keep the fallback instead of jumping to static
 * defaults — critical for partial CMS rollouts.
 */
export const normalizeForEducators = (
  value,
  fallback = DEFAULT_SITE_CONTENT.forEducators
) => {
  const base = fallback || DEFAULT_SITE_CONTENT.forEducators;
  const raw = value || {};
  const image = raw.image || {};
  const imageUrl =
    (typeof image.sourceUrl === "string" && image.sourceUrl.trim()) ||
    (typeof image.mediaItemUrl === "string" && image.mediaItemUrl.trim()) ||
    (typeof raw.imageUrl === "string" && raw.imageUrl.trim()) ||
    base.imageUrl ||
    DEFAULT_SITE_CONTENT.forEducators.imageUrl;

  const destination =
    toRelativeHref(raw.url) ||
    toRelativeHref(raw.destinationUrl) ||
    base.destinationUrl ||
    DEFAULT_SITE_CONTENT.forEducators.destinationUrl;

  const label =
    (typeof raw.label === "string" && raw.label.trim()) ||
    (typeof image.altText === "string" && image.altText.trim()) ||
    base.label ||
    DEFAULT_SITE_CONTENT.forEducators.label;

  return {
    imageUrl,
    destinationUrl: destination,
    label
  };
};

export const normalizeSiteContent = value => {
  const content = value || {};
  const educator = normalizeForEducators(content.forEducators);
  const footerLinks = Array.isArray(content.footerLinks)
    ? content.footerLinks
        .filter(
          link =>
            link &&
            typeof link.label === "string" &&
            link.label.trim() &&
            isRelativeLink(link.url)
        )
        .slice(0, 3)
        .map(link => ({ label: link.label.trim(), url: link.url }))
    : [];

  const maxVideos = normalizeMaxVideos(
    content.maxVideos != null ? content.maxVideos : content.trendingSettings
  );

  return {
    forEducators: educator,
    trendingPostIds: Array.isArray(content.trendingPostIds)
      ? content.trendingPostIds
          .map(Number)
          .filter(Number.isFinite)
          .slice(0, maxVideos)
      : [],
    maxVideos,
    spotlightTitle:
      (typeof content.spotlightTitle === "string" &&
        content.spotlightTitle.trim()) ||
      DEFAULT_SITE_CONTENT.spotlightTitle,
    footerLinks:
      footerLinks.length > 0 ? footerLinks : DEFAULT_SITE_CONTENT.footerLinks
  };
};

/**
 * Merge Settings → HEC Site Settings (canonical) over legacy hectvSiteContent.
 * Canonical fields win only when present/non-empty; partial GraphQL objects
 * (e.g. `{ label: null, url: null, image: null }`) keep normalized legacy
 * values field-by-field instead of wiping them with static defaults.
 */
export const mergeHecSiteChrome = (siteSettings, legacySiteContent) => {
  const legacy = normalizeSiteContent(legacySiteContent);
  const hasMax =
    siteSettings &&
    siteSettings.trendingSettings &&
    siteSettings.trendingSettings.maxVideos != null;

  // Field-level merge: always start from legacy; overlay only set canonical fields.
  const forEducators =
    siteSettings && siteSettings.forEducators != null
      ? normalizeForEducators(siteSettings.forEducators, legacy.forEducators)
      : legacy.forEducators;

  const maxVideos = hasMax
    ? normalizeMaxVideos(siteSettings.trendingSettings)
    : legacy.maxVideos;

  return {
    ...legacy,
    forEducators,
    maxVideos,
    trendingPostIds: legacy.trendingPostIds.slice(0, maxVideos)
  };
};

export const railPromoFromSiteContent = content => {
  const label =
    (content.forEducators && content.forEducators.label) ||
    DEFAULT_RAIL_PROMO.alt;
  return {
    image: {
      sourceUrl: content.forEducators.imageUrl,
      altText: label
    },
    url: content.forEducators.destinationUrl,
    alt: label
  };
};

export const orderPostsByIds = (
  posts,
  ids,
  maxItems = DEFAULT_TRENDING_MAX_VIDEOS
) => {
  const limit = normalizeMaxVideos(maxItems);
  const byId = new Map((posts || []).map(post => [Number(post.postId), post]));
  return (ids || [])
    .map(id => byId.get(Number(id)))
    .filter(Boolean)
    .slice(0, limit);
};
