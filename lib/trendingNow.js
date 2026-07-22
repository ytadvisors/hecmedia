import { getPostImgSrc } from "./getFunctions";

// This adapter is deliberately the only boundary between the Trending Now UI
// and its temporary staging data source. Replace spotlightPosts with a
// dedicated WPGraphQL/ACF query when editorial support is available.
const toTrendingNowItems = spotlightPosts =>
  (spotlightPosts || [])
    .filter(post => post && post.link && post.title)
    .slice(0, 5)
    .map(post => ({
      id: post.postId || post.link,
      title: post.title.replace(/<\/?[^>]+(>|$)/g, ""),
      href: post.link.replace(/https?:\/\/[^/]+/, ""),
      image: getPostImgSrc(post, "small") || getPostImgSrc(post) || null
    }));

export default toTrendingNowItems;
