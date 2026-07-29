import { getPostImgSrc } from "./getFunctions";

const isUsable = post => Boolean(post && post.link && post.title);

const postKey = post => post.postId || post.link;

const decodeHtmlEntities = value =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(
      /&(amp|quot|apos|lt|gt);/g,
      (_, entity) =>
        ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[entity])
    );

const toItem = post => ({
  id: postKey(post),
  title: decodeHtmlEntities(post.title.replace(/<\/?[^>]+(>|$)/g, "")),
  href: post.link.replace(/https?:\/\/[^/]+/, ""),
  image: getPostImgSrc(post, "small") || getPostImgSrc(post) || null
});

/**
 * Trending Now auto-populates from the newest video-type posts. When an
 * editor has curated hectv_featured_videos, those posts take the front of
 * the list in their set order, and the newest videos fill any remaining
 * slots (deduped against whatever is already featured).
 */
export const TRENDING_NOW_MAX_ITEMS = 4;

const toTrendingNowItems = (
  featuredVideos,
  newestVideos,
  maxItems = TRENDING_NOW_MAX_ITEMS
) => {
  const featured = (featuredVideos || []).filter(isUsable);
  const featuredKeys = new Set(featured.map(postKey));
  const newest = (newestVideos || []).filter(
    post => isUsable(post) && !featuredKeys.has(postKey(post))
  );

  return [...featured, ...newest].slice(0, maxItems).map(toItem);
};

export default toTrendingNowItems;
