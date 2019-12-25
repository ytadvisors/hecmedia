import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/react-hooks";
import { GET_ALL_PAGE_CATEGORY } from "../../lib/graphql";
import { getHref } from "../../lib/getFunctions";
import { cleanUrl, getQueryUpdate } from "../../lib/updateFunctions";
import "./styles.scss";

export default ({ link }) => {
  const [currentCursor, setCursor] = useState("");
  console.log("link is: ", link);

  const { data, fetchMore } = useQuery(GET_ALL_PAGE_CATEGORY, {
    variables: { cursor: "" }
  });

  const loadMore = () =>
    fetchMore &&
    fetchMore({
      variables: { cursor: currentCursor },
      updateQuery: (prev, fetchData) =>
        getQueryUpdate(prev, fetchData, "categories")
    });

  const { categories } = data || {};

  const { nodes: menus, pageInfo: { endCursor } = {} } = categories || {};

  if (menus) {
    if (currentCursor !== endCursor && endCursor) {
      setCursor(endCursor);
    }

    /* Set current menu */
    const categoryList = menus.reduce((acc, menu) => {
      let { ...result } = acc;
      const { link: menuLink, children: { nodes: menuList } = {} } = menu || {};
      if (menuLink === link) {
        result = menu;
      } else {
        result = menuList.reduce((childResult, childMenu) => {
          if (childMenu.link === link) {
            result = menu;
          }
          return result;
        }, result);
      }

      return result;
    }, []);

    const {
      name,
      link: categoryLink,
      children: { nodes: subcategoryList } = {}
    } = categoryList;

    if (!name && currentCursor !== "") {
      loadMore();
    }

    let subcategories = [];
    if (name) {
      subcategories = subcategoryList;
      const url = cleanUrl(categoryLink);
      const actualLink = getHref(url);
      return (
        <section className="sub-navigation">
          <div className="row heading">
            <div className="col-md-12">
              <div className="pull-left">
                {categoryLink && (
                  <h2>
                    <Link as={url} href={actualLink}>
                      <a
                        dangerouslySetInnerHTML={{
                          __html: name
                        }}
                      />
                    </Link>
                  </h2>
                )}
              </div>
            </div>
          </div>
          <ul className="link-list">
            {subcategories.map(
              ({ link: subcategoryLink, name: subcategoryName }) => {
                const isActive = link === subcategoryLink ? "active" : "";
                const subUrl = cleanUrl(subcategoryLink);
                const actualSubLink = getHref(subUrl);
                return (
                  <li key={subcategoryLink}>
                    {!isActive && (
                      <Link as={subUrl} href={actualSubLink}>
                        <a
                          dangerouslySetInnerHTML={{
                            __html: subcategoryName
                          }}
                        />
                      </Link>
                    )}
                    {isActive && (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: subcategoryName
                        }}
                      />
                    )}
                  </li>
                );
              }
            )}
          </ul>
        </section>
      );
    }
  }
  return (
    <section className="sub-navigation">
      <div className="row heading">
        <div className="col-md-12">
          <div className="pull-left">
            <h2
              dangerouslySetInnerHTML={{
                __html: "&nbsp; "
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
