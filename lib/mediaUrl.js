const STAGING_WORDPRESS_HOST = "staging-wp.hectv.org";
const PUBLIC_MEDIA_ORIGIN =
  "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com";

const getPublicMediaUrl = sourceUrl => {
  if (!sourceUrl) return sourceUrl;

  try {
    const source = new URL(sourceUrl);
    const isStagingUpload =
      source.hostname === STAGING_WORDPRESS_HOST &&
      source.pathname.startsWith("/wp-content/uploads/");

    if (!isStagingUpload) return sourceUrl;

    return `${PUBLIC_MEDIA_ORIGIN}${source.pathname}${source.search}${source.hash}`;
  } catch (error) {
    return sourceUrl;
  }
};

const STAGING_UPLOAD_ORIGIN = /https?:\/\/staging-wp\.hectv\.org\/wp-content\/uploads\//gi;

/**
 * Rewrite staging upload URLs embedded in rendered WordPress HTML. This is
 * intentionally host-and-path scoped; links to the staging API/admin and every
 * non-staging origin pass through unchanged.
 */
export const rewritePublicMediaHtml = html => {
  if (!html || typeof html !== "string") return html;

  return html.replace(
    STAGING_UPLOAD_ORIGIN,
    `${PUBLIC_MEDIA_ORIGIN}/wp-content/uploads/`
  );
};

export default getPublicMediaUrl;
