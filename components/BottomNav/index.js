import React from "react";
import Link from "next/link";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import { getHref } from "../../lib/getFunctions";

import "./styles.scss";

const BottomNav = ({ title, data: { bottomNav } }) => {
  const {
    node: { menuItems: { edges: bottomList = [] } = {} } = {}
  } = bottomNav ? bottomNav.edges[0] : {};
  return (
    <section className="post-bottom-nav">
      <div className="row">
        <div className="col-md-12">
          {
            <ul>
              <li className="title">{title}</li>
              {bottomList.map(menu => {
                const url = menu.node.url.replace(/https?:\/\/[^/]+/, "");
                const page = getHref(url);
                return (
                  <li key={menu.node.url}>
                    <Link href={page} as={url}>
                      <a>{menu.node.label}</a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          }
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
