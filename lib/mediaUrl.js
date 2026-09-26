const WORDPRESS_UPLOAD_HOSTS = new Set([
  "staging-wp.hectv.org",
  "prod-wp.hectv.org",
  "prod-wp-ecs.hectv.org"
]);
const PUBLIC_MEDIA_ORIGIN =
  "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com";
const PUBLIC_MEDIA_HOST = "prd-hectv-wp-media.s3.us-east-2.amazonaws.com";
// Attachment stems whose public-archive objects 403 (metadata exists, bytes do
// not). Emitting those URLs in img src/srcset fails production hydrated
// verification and shows a broken image. Size suffixes are ignored.
const MISSING_PUBLIC_MEDIA_STEMS = new Set([
  "/wp-content/uploads/2013/01/1319211102_582"
]);
const WORDPRESS_SIZE_SUFFIX = /-\d+x\d+(?=\.[a-z0-9]+$)/i;

export const publicMediaStem = pathname => {
  if (!pathname || !pathname.startsWith("/wp-content/uploads/")) return "";
  return pathname
    .replace(WORDPRESS_SIZE_SUFFIX, "")
    .replace(/\.[a-z0-9]+$/i, "");
};

export const isMissingPublicMedia = sourceUrl => {
  if (!sourceUrl) return false;

  try {
    const source = new URL(sourceUrl);
    const isUploadHost =
      source.hostname === PUBLIC_MEDIA_HOST ||
      WORDPRESS_UPLOAD_HOSTS.has(source.hostname);
    if (!isUploadHost || !source.pathname.startsWith("/wp-content/uploads/")) {
      return false;
    }
    return MISSING_PUBLIC_MEDIA_STEMS.has(publicMediaStem(source.pathname));
  } catch (error) {
    return false;
  }
};

const getPublicMediaUrl = sourceUrl => {
  if (!sourceUrl) return sourceUrl;
  if (isMissingPublicMedia(sourceUrl)) return undefined;

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
const PUBLIC_OR_WP_UPLOAD_URL = /https?:\/\/(?:prd-hectv-wp-media\.s3\.us-east-2\.amazonaws\.com|(?:staging-wp|prod-wp|prod-wp-ecs)\.hectv\.org)\/wp-content\/uploads\/[^\s"'<>]*/gi;
// Quoted src/srcset only — WordPress rendered content uses quotes.
const QUOTED_SRC_ATTR = /\s+src=(["'])(https?:\/\/(?:prd-hectv-wp-media\.s3\.us-east-2\.amazonaws\.com|(?:staging-wp|prod-wp|prod-wp-ecs)\.hectv\.org)\/wp-content\/uploads\/[^"']*)\1/gi;
const QUOTED_SRCSET_ATTR = /\s+srcset=(["'])([^"']*)\1/gi;

/**
 * Drop known-missing upload URLs from rendered HTML without leaving broken
 * attributes: remove the whole `src` attribute, and drop complete `srcset`
 * candidates (URL + descriptor) rather than blanking only the URL text.
 */
const stripMissingPublicMediaFromHtml = html => {
  let result = html.replace(QUOTED_SRC_ATTR, (match, _quote, url) =>
    isMissingPublicMedia(url) ? "" : match
  );

  result = result.replace(QUOTED_SRCSET_ATTR, (match, quote, value) => {
    const kept = value
      .split(",")
      .map(candidate => candidate.trim())
      .filter(Boolean)
      .filter(candidate => {
        const url = candidate.split(/\s+/)[0];
        return !isMissingPublicMedia(url);
      });

    if (kept.length === 0) return "";
    return ` srcset=${quote}${kept.join(", ")}${quote}`;
  });

  // Any remaining bare occurrences (href, plain text) still drop the URL.
  return result.replace(PUBLIC_OR_WP_UPLOAD_URL, url =>
    isMissingPublicMedia(url) ? "" : url
  );
};

/**
 * Rewrite known WordPress upload URLs embedded in rendered HTML to the public
 * media bucket. The ECS upload volume is not the public archive: production
 * attachment metadata can point at valid objects that exist only in this
 * bucket. This is intentionally host-and-path scoped; API/admin links and
 * every unrelated origin pass through unchanged. Known-missing archive
 * objects are dropped so they never become img src/srcset candidates.
 */
export const rewritePublicMediaHtml = html => {
  if (!html || typeof html !== "string") return html;

  const withoutMissing = stripMissingPublicMediaFromHtml(html);

  return withoutMissing.replace(
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
  if (isMissingPublicMedia(sourceUrl)) return null;

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
