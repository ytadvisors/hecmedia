import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/react-hooks";
import { GET_ALL_PAGE_CATEGORY } from "../../lib/graphql";
import { getHref } from "../../lib/getFunctions";
import { cleanUrl, getQueryUpdate } from "../../lib/updateFunctions";
import "./styles.scss";

export const findCategoryForLink = (menus, cleanLink) =>
  (menus || []).reduce((result, menu) => {
    const { link: menuLink, children: { nodes: menuList = [] } = {} } =
      menu || {};
    if (menuLink && menuLink.replace(/\/$/g, "") === cleanLink) return menu;
    return (
      menuList.find(
        childMenu =>
          childMenu && childMenu.link.replace(/\/$/g, "") === cleanLink
      ) || result
    );
  }, []);

const CategoryNav = ({ link }) => {
  const [currentCursor, setCursor] = useState("");
  const [currentName, setName] = useState("");
  const [currentLink, setCategoryLink] = useState("");
  const [subcategories, setCategories] = useState([]);

  const cleanLink = link.replace(/\/$/g, "");
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

  if (!currentName && currentCursor !== "") {
    loadMore();
  }

  useEffect(() => {
    if (currentCursor !== endCursor && endCursor) {
      setCursor(endCursor);
    }

    /* Set current menu */
    if (menus) {
      const categoryList = findCategoryForLink(menus, cleanLink);

      const {
        name,
        link: categoryLink,
        children: { nodes: subcategoryList } = {}
      } = categoryList;

      setCategories(subcategoryList);
      setCategoryLink(categoryLink);
      setName(name);
    }
  }, [menus, link]);

  if (currentName) {
    const url = cleanUrl(currentLink);
    const actualLink = getHref(url);
    return (
      <section className="sub-navigation">
        <div className="row heading">
          <div className="col-md-12">
            <div className="pull-left">
              {currentLink && (
                <h2>
                  <Link as={url} href={actualLink}>
                    <a
                      dangerouslySetInnerHTML={{
                        __html: currentName
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
              const isActive =
                cleanLink === subcategoryLink.replace(/\/$/g, "")
                  ? "active"
                  : "";
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

export default CategoryNav;
