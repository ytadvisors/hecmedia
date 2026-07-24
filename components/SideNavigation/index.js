import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { GET_RAIL_PROMO } from "../../lib/graphql";
import "./styles.scss";

export const SideNavigation = ({ children, railPromo }) => {
  const image = railPromo && railPromo.image;

  return (
    <section className="side-navigation">
      {image && image.sourceUrl && railPromo.url && (
        <a className="rail-promo" href={railPromo.url}>
          <img
            src={image.sourceUrl}
            alt={railPromo.alt || image.altText || "For Educators"}
          />
        </a>
      )}
      {children}
    </section>
  );
};

export default ({ children }) => {
  const { data } = useQuery(GET_RAIL_PROMO, {
    notifyOnNetworkStatusChange: true
  });
  const { railPromo } = (data && data.hectvSiteOptions) || {};

  return <SideNavigation railPromo={railPromo}>{children}</SideNavigation>;
};
