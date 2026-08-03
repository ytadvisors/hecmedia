import React from "react";
import { DEFAULT_RAIL_PROMO } from "../../lib/stagingCompatibility";

/**
 * Resolve a display URL for the For Educators rail logo.
 *
 * GraphQL (RootQuery.forEducators.image.sourceUrl) already returns:
 *  - S3/CDN URLs when Media Offload has synced the attachment
 *  - staging-wp / WP host upload URLs when the file is local-only
 *
 * Never force a blind rewrite of public WP upload URLs onto the S3 bucket:
 * freshly selected logos may not be offloaded yet, and that produced an empty
 * broken image (browser alt text "For Educators") despite a valid GraphQL link.
 * Only remap private LAN hosts (localhost / Tailscale) onto WP_HOST.
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
      // Public host (staging-wp, S3, CDN) — trust GraphQL as returned.
      return sourceUrl;
    }

    if (!publicWordPressHost) return sourceUrl;

    const publicHost = new URL(publicWordPressHost);
    // Private origin only: surface the same path on the public WP host.
    // Do not chain into S3 rewrite — local-only uploads 403 there.
    return `${publicHost.origin}${source.pathname}${source.search}${source.hash}`;
  } catch (error) {
    return sourceUrl;
  }
};

export const SideNavigation = ({ children, railPromo }) => {
  const image = railPromo && railPromo.image;

  return (
    <section className="side-navigation">
      {image && image.sourceUrl && railPromo.url && (
        <a className="rail-promo" href={railPromo.url}>
          <img
            src={getPublicRailPromoUrl(image.sourceUrl)}
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
