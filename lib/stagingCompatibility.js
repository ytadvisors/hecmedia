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

export const DEFAULT_RAIL_PROMO = {
  image: {
    sourceUrl:
      "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/3ca97ec68430409a-For-Educators.jpg",
    altText: "For Educators"
  },
  url: "/category/education",
  alt: "For Educators"
};

export const DEFAULT_SITE_CONTENT = {
  forEducators: {
    imageUrl: DEFAULT_RAIL_PROMO.image.sourceUrl,
    destinationUrl: DEFAULT_RAIL_PROMO.url
  },
  trendingPostIds: [],
  spotlightTitle: "Spotlight STL",
  footerLinks: [
    { label: "Arts", url: "/category/arts" },
    { label: "Education", url: "/category/education" },
    { label: "Business", url: "/category/business" }
  ],
  mobileRailFirst: true
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
      footerLinks.length > 0 ? footerLinks : DEFAULT_SITE_CONTENT.footerLinks,
    mobileRailFirst: content.mobileRailFirst !== false
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
