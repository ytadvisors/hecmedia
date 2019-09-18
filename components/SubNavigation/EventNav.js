import React from "react";
import Link from "next/link";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import { Nav, NavItem, NavDropdown } from "react-bootstrap";
import { Router } from "../../routes";
import NavWrap from "../NavWrap";
import CalendarSelector from "../CalendarSelector";
import { getArrayUnion } from "../../lib/updateFunctions";
import { getFormattedDate } from "../../lib/getFunctions";
import "./styles.scss";

export const EventNav = props => {
  let cursor = "";
  const {
    link,
    title,
    currentDate,
    currentCategory,
    data: { categories, fetchMore }
  } = props;

  if (categories && categories.edges) {
    cursor = categories.pageInfo.endCursor;
    fetchMore({
      variables: {
        cursor
      },
      updateQuery: (prev, updateProps) => {
        const { fetchMoreResult } = updateProps;
        let updateArray = prev;
        const numResults = fetchMoreResult.categories.edges.length;
        if (fetchMoreResult && numResults > 0) {
          updateArray = getArrayUnion(
            prev,
            fetchMoreResult,
            "categories",
            "node.eventCategoryId"
          );
        }
        return updateArray;
      }
    });
  }

  const changeDate = newDate => {
    Router.pushRoute(`/events/${currentCategory}/${getFormattedDate(newDate)}`);
  };

  const getChangedCategory = newCategory =>
    `/events/${newCategory}/${getFormattedDate(currentDate)}`;

  const currentTitle =
    currentCategory === "All" ? "Filter Events" : currentCategory;
  return (
    <section className="sub-navigation event-nav">
      <div className="pull-left">
        <h2>
          <Link href={link.replace(/https?:\/\/[^/]+/, "")}>
            <a dangerouslySetInnerHTML={{ __html: title }} />
          </Link>
        </h2>
      </div>
      <Nav className="event-nav-links">
        <NavDropdown
          className="drop-down-menu-list pull-right"
          title={currentTitle}
          id="filter"
          key="filter"
        >
          {currentTitle !== "Filter Events" && (
            <NavWrap key="All">
              <Link
                href="/events/[category]/[day]/"
                as={getChangedCategory("All")}
              >
                <a>
                  <span>All Events</span>
                </a>
              </Link>
            </NavWrap>
          )}
          {categories &&
            categories.edges &&
            categories.edges.map(menu => (
              <NavWrap key={menu.node.link}>
                <Link
                  href="/events/[category]/[day]/"
                  as={getChangedCategory(menu.node.slug)}
                >
                  <a>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: menu.node.name
                      }}
                    />
                  </a>
                </Link>
              </NavWrap>
            ))}
        </NavDropdown>
        <NavItem className="pull-right calendar-container">
          <CalendarSelector callback={changeDate} currentDate={currentDate} />
        </NavItem>
      </Nav>
    </section>
  );
};

export const allCategories = gql`
  query allCategories($cursor: String!) {
    categories: eventCategories(
      after: $cursor
      where: { shouldOutputInFlatList: true }
    ) {
      edges {
        node {
          slug
          name
          link
          eventCategoryId
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export default graphql(allCategories, {
  options: { variables: { cursor: "" } }
})(EventNav);
