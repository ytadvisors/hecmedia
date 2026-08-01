import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/react-hooks";
import { GET_ALL_PAGE_CATEGORY } from "../../lib/graphql";
import { getHref } from "../../lib/getFunctions";
import { cleanUrl, getQueryUpdate } from "../../lib/updateFunctions";

export const findCategoryForLink = (menus, cleanLink) =>
  (menus || []).reduce((result, menu) => {
    const { link: menuLink, children: { nodes: menuList = [] } = {} } =
      menu || {};
    if (menuLink && menuLink.replace(/\/$/g, "") === cleanLink) return menu;
    return menuList.some(
      childMenu => childMenu && childMenu.link.replace(/\/$/g, "") === cleanLink
    )
      ? menu
      : result;
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

  const { categories } = data || {};
  const { nodes: menus, pageInfo: { endCursor, hasNextPage = false } = {} } =
    categories || {};

  useEffect(() => {
    if (!menus) return;

    const categoryList = findCategoryForLink(menus, cleanLink);
    const {
      name,
      link: categoryLink,
      children: { nodes: subcategoryList = [] } = {}
    } = categoryList;

    if (name) {
      setCategories(subcategoryList);
      setCategoryLink(categoryLink);
      setName(name);
      return;
    }

    // Some nested category URLs are not present in the first ten roots. Fetch
    // each cursor once from an effect, and stop when WPGraphQL says there is no
    // next page. Calling fetchMore during render previously created an endless
    // request/render loop on routes such as /category/arts/two_on_the_aisle.
    if (hasNextPage && endCursor && currentCursor !== endCursor && fetchMore) {
      setCursor(endCursor);
      fetchMore({
        variables: { cursor: endCursor },
        updateQuery: (prev, fetchData) =>
          getQueryUpdate(prev, fetchData, "categories")
      });
    }
  }, [cleanLink, currentCursor, endCursor, fetchMore, hasNextPage, menus]);

  if (currentName) {
    const url = cleanUrl(currentLink);
    return (
      <section className="sub-navigation">
        <div className="row heading">
          <div className="col-md-12">
            <div className="pull-left">
              {currentLink && (
                <h2>
                  <a
                    href={url}
                    aria-label={currentName.replace(/<[^>]*>/g, "")}
                    dangerouslySetInnerHTML={{
                      __html: currentName
                    }}
                  />
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
