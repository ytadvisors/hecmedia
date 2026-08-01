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

export default getPublicMediaUrl;
