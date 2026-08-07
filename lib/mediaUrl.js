const WORDPRESS_UPLOAD_HOSTS = new Set([
  "staging-wp.hectv.org",
  "prod-wp.hectv.org",
  "prod-wp-ecs.hectv.org"
]);
const PUBLIC_MEDIA_ORIGIN =
  "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com";

const getPublicMediaUrl = sourceUrl => {
  if (!sourceUrl) return sourceUrl;

  try {
    const source = new URL(sourceUrl);
    const isWordPressUpload =
      WORDPRESS_UPLOAD_HOSTS.has(source.hostname) &&
      source.pathname.startsWith("/wp-content/uploads/");

    if (!isWordPressUpload) return sourceUrl;

    return `${PUBLIC_MEDIA_ORIGIN}${source.pathname}${source.search}${source.hash}`;
  } catch (error) {
    return sourceUrl;
  }
};

const WORDPRESS_UPLOAD_ORIGIN = /https?:\/\/(?:staging-wp|prod-wp|prod-wp-ecs)\.hectv\.org\/wp-content\/uploads\//gi;

/**
 * Rewrite known WordPress upload URLs embedded in rendered HTML to the public
 * media bucket. The ECS upload volume is not the public archive: production
 * attachment metadata can point at valid objects that exist only in this
 * bucket. This is intentionally host-and-path scoped; API/admin links and
 * every unrelated origin pass through unchanged.
 */
export const rewritePublicMediaHtml = html => {
  if (!html || typeof html !== "string") return html;

  return html.replace(
    WORDPRESS_UPLOAD_ORIGIN,
    `${PUBLIC_MEDIA_ORIGIN}/wp-content/uploads/`
  );
};

/**
 * If a public-bucket image ever misses, retry the same object on the active
 * WordPress host before the component falls back to its local placeholder.
 * This preserves newly uploaded, not-yet-offloaded media during propagation.
 */
export const getWordPressMediaFallbackUrl = sourceUrl => {
  if (!sourceUrl) return null;

  try {
    const source = new URL(sourceUrl);
    const publicOrigin = new URL(PUBLIC_MEDIA_ORIGIN);
    const configuredWordPressHost = [
      process.env.WP_HOST,
      process.env.GATSBY_WP_HOST,
      process.env.APOLLO_CLIENT_URI
    ].find(value => {
      if (!value) return false;
      try {
        const candidate = new URL(value);
        return /^https?:$/.test(candidate.protocol);
      } catch (error) {
        return false;
      }
    });

    if (!configuredWordPressHost) return null;

    const wordpressOrigin = new URL(configuredWordPressHost);
    if (
      source.hostname !== publicOrigin.hostname ||
      !source.pathname.startsWith("/wp-content/uploads/")
    ) {
      return null;
    }

    return `${wordpressOrigin.origin}${source.pathname}${source.search}${source.hash}`;
  } catch (error) {
    return null;
  }
};

export default getPublicMediaUrl;
