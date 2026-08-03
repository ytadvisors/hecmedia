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

    const valid = parsed
      .filter(
        cta =>
          cta &&
          typeof cta.label === "string" &&
          cta.label.trim() &&
          isRelativeLink(cta.url)
      )
      .slice(0, 5)
      .map(cta => ({
        label: cta.label.trim(),
        url: cta.url,
        style: cta.style || "secondary"
      }));

    return valid.length > 0 ? valid : DEFAULT_TOPBAR_CTAS;
  } catch (error) {
    return DEFAULT_TOPBAR_CTAS;
  }
};

const CTA_STYLES = new Set(["primary", "secondary", "tertiary"]);

/**
 * Map WPGraphQL HEADER_ACTIONS menu items → Header topbarCtas shape.
 * Style is taken from the first cssClasses entry when it is primary|secondary|tertiary.
 * Prefer path over absolute url so links stay on the frontend origin.
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
      const path =
        typeof node.path === "string" && node.path.trim()
          ? node.path.trim()
          : "";
      const url =
        typeof node.url === "string" && node.url.trim() ? node.url.trim() : "";
      let href = path || url;
      // Absolute WP host URLs → keep path-only when we can parse it.
      if (href && !href.startsWith("/") && href.includes("://")) {
        try {
          const parsed = new URL(href);
          href = `${parsed.pathname || "/"}${parsed.search ||
            ""}${parsed.hash || ""}`;
        } catch (e) {
          href = "";
        }
      }
      if (!isRelativeLink(href)) return null;

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

export const DEFAULT_SITE_CONTENT = {
  forEducators: {
    imageUrl: DEFAULT_RAIL_PROMO.image.sourceUrl,
    destinationUrl: DEFAULT_RAIL_PROMO.url
  },
  trendingPostIds: [],
  spotlightTitle: "Spotlight STL",
  // BottomNav "more from" rail — not the full site footer.
  footerLinks: [
    { label: "Arts", url: "/category/arts" },
    { label: "Education", url: "/category/education" },
    { label: "Business", url: "/category/business" }
  ]
};

export const normalizeSiteContent = value => {
  const content = value || {};
  const educator = content.forEducators || {};
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

  return {
    forEducators: {
      imageUrl: educator.imageUrl || DEFAULT_SITE_CONTENT.forEducators.imageUrl,
      destinationUrl: isRelativeLink(educator.destinationUrl)
        ? educator.destinationUrl
        : DEFAULT_SITE_CONTENT.forEducators.destinationUrl
    },
    trendingPostIds: Array.isArray(content.trendingPostIds)
      ? content.trendingPostIds
          .map(Number)
          .filter(Number.isFinite)
          .slice(0, 4)
      : [],
    spotlightTitle:
      (typeof content.spotlightTitle === "string" &&
        content.spotlightTitle.trim()) ||
      DEFAULT_SITE_CONTENT.spotlightTitle,
    footerLinks:
      footerLinks.length > 0 ? footerLinks : DEFAULT_SITE_CONTENT.footerLinks
  };
};

export const railPromoFromSiteContent = content => ({
  image: {
    sourceUrl: content.forEducators.imageUrl,
    altText: "For Educators"
  },
  url: content.forEducators.destinationUrl,
  alt: "For Educators"
});

export const orderPostsByIds = (posts, ids) => {
  const byId = new Map((posts || []).map(post => [Number(post.postId), post]));
  return (ids || [])
    .map(id => byId.get(Number(id)))
    .filter(Boolean)
    .slice(0, 4);
};
