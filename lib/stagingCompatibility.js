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
  url: "/for-educators",
  alt: "For Educators"
};
