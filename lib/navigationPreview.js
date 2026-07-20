const NAVIGATION_PREVIEW_GROUPS = [
  { label: "Home", url: "#nav-home", matches: ["home"] },
  {
    label: "Watch",
    url: "#nav-watch",
    matches: ["program", "schedule", "watch", "video", "spotlight", "magazine"]
  },
  {
    label: "Learn & Explore",
    url: "#nav-learn-explore",
    matches: [
      "education",
      "educator",
      "learn",
      "school",
      "classroom",
      "arts",
      "culture"
    ]
  },
  {
    label: "Connect",
    url: "#nav-connect",
    matches: ["event", "community", "about", "contact", "news", "story"]
  },
  {
    label: "Support HEC Media",
    url: "#nav-support",
    matches: [
      "donate",
      "support",
      "underwriting",
      "sponsor",
      "membership",
      "give"
    ]
  }
];

const getSearchText = ({ label = "", url = "" }) =>
  `${label} ${url}`.toLowerCase();

const isHomeLink = ({ label = "", url = "" }) =>
  label.toLowerCase() === "home" || url.replace(/https?:\/\/[^/]+/, "") === "/";

const getGroupIndex = link => {
  if (isHomeLink(link)) return 0;

  const searchText = getSearchText(link);
  const groupIndex = NAVIGATION_PREVIEW_GROUPS.findIndex(
    ({ matches }, index) =>
      index > 0 && matches.some(match => searchText.includes(match))
  );

  // Keep unrecognised CMS items visible while Jayne reviews the proposed mapping.
  return groupIndex === -1 ? 3 : groupIndex;
};

const getVisibleLinks = link => [
  { ...link, children: undefined },
  ...(link.children || [])
];

export const isNavigationPreviewEnabled = () =>
  process.env.HECMEDIA_NAVIGATION_PREVIEW === "true";

export const buildNavigationPreview = links => {
  if (!isNavigationPreviewEnabled()) return links;

  const groupedLinks = NAVIGATION_PREVIEW_GROUPS.map(group => ({
    ...group,
    children: []
  }));

  links.forEach(link => {
    groupedLinks[getGroupIndex(link)].children.push(...getVisibleLinks(link));
  });

  return groupedLinks.filter(group => group.children.length > 0);
};

export { NAVIGATION_PREVIEW_GROUPS };
