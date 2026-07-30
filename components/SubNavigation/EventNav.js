import React from "react";
import Link from "next/link";
import { Nav, NavItem, NavDropdown } from "react-bootstrap";
import { useQuery } from "@apollo/react-hooks";
import { Router } from "../../routes";
import { GET_EVENTS_CATEGORIES } from "../../lib/graphql";
import NavWrap from "../NavWrap";
import CalendarSelector from "../CalendarSelector";
import { getFormattedDate } from "../../lib/getFunctions";

export default props => {
  const { link, title, currentDate, currentCategory } = props;
  const variables = { limit: 30 };
  const { data } = useQuery(GET_EVENTS_CATEGORIES, {
    variables,
    notifyOnNetworkStatusChange: true
  });

  const { categories } = data || {};
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
          <Link href={link.replace(/https?:\/\/[^/]+/, "")} legacyBehavior>
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
                legacyBehavior
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
                  legacyBehavior
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
