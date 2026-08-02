import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import { menuNodeToRelativeUrl, toSiteRelativeUrl } from "../../lib/navUrl";

/**
 * "more from" rail above the site footer.
 *
 * Source: WordPress Appearance → Menus → **BottomNav** (slug: `bottomnav`).
 * The site Footer columns use the separate **Footer** menu — do not mix them.
 *
 * Priority: explicit `links` prop → GraphQL bottomnav menu → empty (hide).
 */
export const BottomNav = ({ title, links, data: { bottomNav } = {} }) => {
  const firstBottomNav =
    bottomNav && Array.isArray(bottomNav.edges) ? bottomNav.edges[0] || {} : {};
  const {
    node: { menuItems: { edges: bottomList = [] } = {} } = {}
  } = firstBottomNav;
  const renderedLinks =
    Array.isArray(links) && links.length > 0
      ? links.map(link => ({
          label: link.label,
          url: toSiteRelativeUrl(link.url)
        }))
      : (Array.isArray(bottomList) ? bottomList : [])
          .filter(menu => menu && menu.node)
          .map(menu => ({
            label: menu.node.label,
            url: menuNodeToRelativeUrl(menu.node)
          }));

  if (!renderedLinks.length) {
    return null;
  }

  return (
    <section className="post-bottom-nav">
      <div className="row">
        <div className="col-md-12">
          <ul>
            <li className="title">{title}</li>
            {renderedLinks.map(link => (
              <li key={`${link.label}:${link.url}`}>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export const allNavs = gql`
  query allNavs {
    bottomNav: menus(where: { slug: "bottomnav" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                path
                childItems {
                  edges {
                    node {
                      url
                      path
                      label
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default graphql(allNavs)(BottomNav);
