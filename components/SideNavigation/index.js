import React from "react";
import { DEFAULT_RAIL_PROMO } from "../../lib/stagingCompatibility";
import getPublicMediaUrl from "../../lib/mediaUrl";

export const getPublicRailPromoUrl = sourceUrl => {
  const publicWordPressHost = process.env.WP_HOST;
  if (!sourceUrl || !publicWordPressHost) return sourceUrl;

  try {
    const source = new URL(sourceUrl);
    const isPrivateWordPressHost =
      source.hostname === "localhost" ||
      source.hostname === "127.0.0.1" ||
      source.hostname.endsWith(".ts.net");
    if (!isPrivateWordPressHost) return getPublicMediaUrl(sourceUrl);

    const publicHost = new URL(publicWordPressHost);
    return getPublicMediaUrl(
      `${publicHost.origin}${source.pathname}${source.search}`
    );
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
