import React from "react";
import { DEFAULT_RAIL_PROMO } from "../../lib/stagingCompatibility";
import getPublicMediaUrl, {
  getWordPressMediaFallbackUrl
} from "../../lib/mediaUrl";
import MediaImage from "../MediaImage";

/**
 * Resolve a display URL for the For Educators rail logo.
 *
 * GraphQL (RootQuery.forEducators.image.sourceUrl) already returns:
 *  - S3/CDN URLs when Media Offload has synced the attachment
 *  - staging-wp / WP host upload URLs when the file is local-only
 *
 * This helper only remaps private LAN hosts (localhost / Tailscale) onto
 * WP_HOST. SideNavigation separately canonicalizes known public WordPress
 * uploads to the archive and retains the active WordPress URL as a fallback,
 * so freshly selected, not-yet-offloaded logos remain visible.
 */
export const getPublicRailPromoUrl = sourceUrl => {
  const publicWordPressHost = process.env.WP_HOST;
  if (!sourceUrl) return sourceUrl;

  try {
    const source = new URL(sourceUrl);
    const isPrivateWordPressHost =
      source.hostname === "localhost" ||
      source.hostname === "127.0.0.1" ||
      source.hostname.endsWith(".ts.net");

    if (!isPrivateWordPressHost) {
      // Public host (staging-wp, S3, CDN) — leave mapping to the image chain.
      return sourceUrl;
    }

    if (!publicWordPressHost) return sourceUrl;

    const publicHost = new URL(publicWordPressHost);
    // Private origin only: surface the same path on the public WP host.
    return `${publicHost.origin}${source.pathname}${source.search}${source.hash}`;
  } catch (error) {
    return sourceUrl;
  }
};

export const SideNavigation = ({ children, railPromo }) => {
  const image = railPromo && railPromo.image;
  const publicSource =
    image && getPublicMediaUrl(getPublicRailPromoUrl(image.sourceUrl));

  return (
    <section className="side-navigation">
      {image && image.sourceUrl && railPromo.url && (
        <a className="rail-promo" href={railPromo.url}>
          <MediaImage
            src={publicSource}
            fallbackSrc={getWordPressMediaFallbackUrl(publicSource)}
            finalSrc={DEFAULT_RAIL_PROMO.image.sourceUrl}
            alt={railPromo.alt || image.altText || "For Educators"}
          />
        </a>
      )}
      {children}
    </section>
  );
};

export default ({ children, railPromo: configuredRailPromo }) => {
  const railPromo = configuredRailPromo || DEFAULT_RAIL_PROMO;

  return <SideNavigation railPromo={railPromo}>{children}</SideNavigation>;
};
