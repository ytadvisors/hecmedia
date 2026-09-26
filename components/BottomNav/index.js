import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import { menuNodeToNavUrl, resolveNavUrl } from "../../lib/navUrl";

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
      ? links.map(link => {
          const { href, external } = resolveNavUrl(link.url);
          return {
            label: link.label,
            url: href,
            external
          };
        })
      : (Array.isArray(bottomList) ? bottomList : [])
          .filter(menu => menu && menu.node)
          .map(menu => {
            const { href, external } = menuNodeToNavUrl(menu.node);
            return {
              label: menu.node.label,
              url: href,
              external
            };
          });

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
