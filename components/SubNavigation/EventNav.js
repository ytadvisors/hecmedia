import React from "react";
import Link from "next/link";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import { Nav, NavItem, NavDropdown } from "react-bootstrap";
import NavWrap from "../NavWrap";
import CalendarSelector from "../CalendarSelector";
import { getArrayUnion } from "../../lib/updateFunctions";
import "./styles.scss";

let cursor = "";

export const EventNav = props => {
  const {
    link,
    title,
    changeDate,
    changeCategory,
    selectTitle,
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
          title={selectTitle}
          id="filter"
          key="filter"
        >
          {categories &&
            categories.edges &&
            categories.edges.map(menu => (
              <NavWrap key={menu.node.link}>
                <button
                  type="button"
                  onClick={() => changeCategory(menu.node.slug)}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: menu.node.name
                    }}
                  />
                </button>
              </NavWrap>
            ))}
        </NavDropdown>
        <NavItem className="pull-right calendar-container">
          <CalendarSelector callback={changeDate} />
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
  options: { variables: { cursor } }
})(EventNav);
