import React from "react";
import Link from "next/link";
import { useQuery } from "@apollo/react-hooks";
import {
  GET_CATEGORY_NAV_CHILDREN,
  GET_CATEGORY_NAV_NODE
} from "../../lib/graphql";
import { getHref } from "../../lib/getFunctions";
import { toSiteRelativeUrl } from "../../lib/navUrl";

export const normalizeCategoryLink = value => {
  const href = toSiteRelativeUrl(value || "/").replace(/[?#].*$/, "");
  return href === "/" ? href : href.replace(/\/+$/, "");
};

const CategoryNav = ({ link }) => {
  const cleanLink = normalizeCategoryLink(link);
  const { data: categoryData } = useQuery(GET_CATEGORY_NAV_NODE, {
    variables: { id: cleanLink }
  });

  const category = categoryData && categoryData.category;
  const parent = category && category.parent && category.parent.node;
  const currentCategory = parent || category;
  const parentId = currentCategory ? currentCategory.databaseId : 0;
  const { data: childrenData } = useQuery(GET_CATEGORY_NAV_CHILDREN, {
    variables: { parent: parentId },
    skip: !parentId
  });

  const currentName = currentCategory ? currentCategory.name : "";
  const currentLink = currentCategory ? currentCategory.link : "";
  const subcategories =
    (childrenData &&
      childrenData.categories &&
      childrenData.categories.nodes) ||
    [];

  if (currentName) {
    const url = toSiteRelativeUrl(currentLink);
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
                cleanLink === normalizeCategoryLink(subcategoryLink)
                  ? "active"
                  : "";
              const subUrl = toSiteRelativeUrl(subcategoryLink);
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
