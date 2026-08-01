import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";

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
          url: link.url
        }))
      : bottomList.map(menu => ({
          label: menu.node.label,
          url: menu.node.url.replace(/https?:\/\/[^/]+/, "")
        }));
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
                childItems {
                  edges {
                    node {
                      url
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
