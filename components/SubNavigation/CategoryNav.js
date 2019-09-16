import React from "react";
import Link from "next/link";
import { graphql } from "react-apollo";
import { useRouter } from "next/router";
import gql from "graphql-tag";
import "./styles.scss";

const { WP_HOST } = process.env;
let cursor = "";

export const CategoryNav = props => {
  const {
    data: { categories, fetchMore }
  } = props;
  const router = useRouter();
  const { asPath } = router;
  const link = `${WP_HOST}${asPath}`;

  if (categories && categories.edges) {
    const menus = categories.edges;
    cursor = categories.pageInfo.endCursor;
    const categoryList = menus.reduce((acc, menu) => {
      let { ...result } = acc;
      if (menu.node.link === link) result = menu;
      else
        result = menu.node.children.edges.reduce((childResult, childMenu) => {
          if (childMenu.node.link === link) result = menu;
          return result;
        }, result);
      return result;
    }, []);

    if (!categoryList.node)
      fetchMore({
        variables: {
          cursor
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...prev,
            categories: { ...prev.categories, ...fetchMoreResult.categories }
          };
        }
      });

    if (categoryList.node) {
      const subcategories = categoryList.node.children.edges;
      return (
        <section className="sub-navigation">
          <div className="row heading">
            <div className="col-md-12">
              <div className="pull-left">
                {categoryList.node.link && (
                  <h2>
                    <Link
                      href={categoryList.node.link.replace(
                        /https?:\/\/[^/]+/,
                        ""
                      )}
                    >
                      <a
                        dangerouslySetInnerHTML={{
                          __html: categoryList.node.name
                        }}
                      />
                    </Link>
                  </h2>
                )}
              </div>
            </div>
          </div>
          <ul className="link-list">
            {subcategories.map(subcategory => {
              const isActive = link === subcategory.node.link ? "active" : "";
              return (
                <li key={subcategory.node.link}>
                  {!isActive && (
                    <Link
                      href={subcategory.node.link.replace(
                        /https?:\/\/[^/]+/,
                        ""
                      )}
                    >
                      <a
                        dangerouslySetInnerHTML={{
                          __html: subcategory.node.name
                        }}
                      />
                    </Link>
                  )}
                  {isActive && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: subcategory.node.name
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      );
    }
  }
  return <></>;
};

export const allCategories = gql`
  query allCategories($cursor: String!) {
    categories(after: $cursor) {
      edges {
        node {
          name
          link
          children {
            edges {
              node {
                link
                name
              }
            }
          }
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export default graphql(allCategories, {
  options: { variables: { cursor } }
})(CategoryNav);
