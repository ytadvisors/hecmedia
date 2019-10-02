import React from "react";
import Link from "next/link";
import { useQuery } from "@apollo/react-hooks";
import { useRouter } from "next/router";
import { GET_ALL_PAGE_CATEGORY } from "../../lib/graphql";
import { getHref } from "../../lib/getFunctions";
import { cleanUrl } from "../../lib/updateFunctions";
import "./styles.scss";

export default () => {
  let cursor = "";
  const router = useRouter();
  const { asPath } = router;
  const link = `${process.env.WP_HOST}${asPath}`;
  const variables = { cursor };

  const { data, fetchMore } = useQuery(GET_ALL_PAGE_CATEGORY, {
    variables,
    notifyOnNetworkStatusChange: true
  });

  const { categories } = data || {};
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
          cursor: cursor || ""
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
      const url = cleanUrl(categoryList.node.link);
      const actualLink = getHref(url);
      return (
        <section className="sub-navigation">
          <div className="row heading">
            <div className="col-md-12">
              <div className="pull-left">
                {categoryList.node.link && (
                  <h2>
                    <Link as={url} href={actualLink}>
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
              const subUrl = cleanUrl(subcategory.node.link);
              const actualSubLink = getHref(subUrl);
              return (
                <li key={subcategory.node.link}>
                  {!isActive && (
                    <Link as={subUrl} href={actualSubLink}>
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
  return <section className="sub-navigation" />;
};
