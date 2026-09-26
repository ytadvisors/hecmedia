import React from "react";
import _ from "lodash";
import { getSocialMenuObject } from "../../lib/getFunctions";
import SocialLinks from "../SocialLinks";
import { menuNodeToNavUrl, resolveNavUrl } from "../../lib/navUrl";

/**
 * Pull menu item edges from a menus(where: { slug }) connection.
 * Shape: { edges: [ { node: { menuItems: { edges: [...] } } } ] }
 */
export const getFooterMenuItemEdges = footer => {
  if (!footer || !Array.isArray(footer.edges) || footer.edges.length === 0) {
    return [];
  }
  const first = footer.edges[0] || {};
  const node = first.node || {};
  const menuItems = node.menuItems || {};
  const { edges } = menuItems;
  return Array.isArray(edges) ? edges.filter(e => e && e.node) : [];
};

/**
 * Normalize either GraphQL footer menu edges or simple {label,url} rows
 * into [{ label, url, external }] for rendering.
 */
export const normalizeFooterLinks = (footerMenuEdges, fallbackLinks) => {
  const fromMenu = (Array.isArray(footerMenuEdges) ? footerMenuEdges : [])
    .map(edge => {
      const node = edge && edge.node;
      if (!node || !node.label) return null;
      const { href, external } = menuNodeToNavUrl(node);
      return {
        label: String(node.label).trim(),
        url: href,
        external
      };
    })
    .filter(Boolean);

  if (fromMenu.length > 0) return fromMenu;

  return (Array.isArray(fallbackLinks) ? fallbackLinks : [])
    .filter(
      link =>
        link &&
        typeof link.label === "string" &&
        link.label.trim() &&
        typeof link.url === "string" &&
        link.url.trim()
    )
    .map(link => {
      const { href, external } = resolveNavUrl(link.url);
      return {
        label: link.label.trim(),
        url: href,
        external
      };
    });
};

export default props => {
  const { footer, social, links: fallbackLinks } = props;

  // Primary source: WordPress menu slug "footer" via GraphQL.
  const footerMenuEdges = getFooterMenuItemEdges(footer);
  const footerLinks = normalizeFooterLinks(footerMenuEdges, fallbackLinks);

  const firstSocial =
    social && Array.isArray(social.edges) ? social.edges[0] || {} : {};
  const { node: { menuItems: { edges: socialList = [] } = {} } = {} } = social
    ? firstSocial
    : {};

  const columnSize = Math.max(1, Math.ceil(footerLinks.length / 2) || 1);
  const columns = _.chunk(footerLinks, columnSize);
  const linkMap = columns.map((obj, x) => ({
    id: x,
    obj
  }));

  const withoutTwitter = socialLinks =>
    socialLinks.filter(
      socialLink =>
        socialLink &&
        socialLink.label &&
        socialLink.label.toLowerCase() !== "twitter"
    );
  const largeSocialLinks = withoutTwitter(
    getSocialMenuObject(socialList, 30, "white")
  );
  const footerSocialLinks = withoutTwitter(
    getSocialMenuObject(socialList, 25, "white")
  );
  const logo = "/static/assets/white_hec.png";

  return (
    <section className="footer">
      <div className="container">
        <div className="row">
          <div className="text-center mobile">
            <div className="social-container">
              <SocialLinks links={largeSocialLinks} />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xs-3 no-mobile">
            <div className="logo">
              <img
                src={logo}
                className="img-responsive"
                alt="logo"
                width={160}
                height={48}
              />
            </div>
            <div className="">
              <div className="social-container">
                <SocialLinks links={footerSocialLinks} />
              </div>
            </div>
          </div>
          {linkMap.map(pageLinks => (
            <div key={pageLinks.id} className="col-xs-6 col-sm-3 no-padding">
              <ul>
                {pageLinks.obj.map(link => (
                  <li key={`${link.label}:${link.url}`}>
                    <a
                      href={link.url}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
