import React from "react";
import moment from "moment";
import Link from "next/link";
import { graphql } from "react-apollo";
import gql from "graphql-tag";

import "./styles.scss";

const mDay = moment(new Date());
const currentDay = moment(mDay).format("YYYY-MM-DD");
const startDay = `${currentDay} 00:00:00`;

const ListOfEvents = ({ data: { events } }) => (
  <section className="list-of-events">
    <div className="title">
      <div>
        <h4>Things to do in St. Louis</h4>
      </div>
    </div>
    <ul className="event-list">
      {events &&
        events.edges.map((event, x) => {
          const {
            node: { title, link }
          } = event;
          return (
            link && (
              <li key={link}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: `${x + 1}. ${title}. `
                  }}
                />
                <Link href={link.replace(/https?:\/\/[^/]+/, "")}>
                  <a>Read More</a>
                </Link>
              </li>
            )
          );
        })}
    </ul>
  </section>
);

export const allEvents = gql`
  query allEvents($startDay: String!) {
    events(
      first: 5
      where: {
        metaQuery: {
          relation: OR
          metaArray: [
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $startDay
              key: "event_dates_0_end_time"
            }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $startDay
              key: "event_dates_1_end_time"
            }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $startDay
              key: "event_dates_2_end_time"
            }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $startDay
              key: "event_dates_3_end_time"
            }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $startDay
              key: "event_dates_4_end_time"
            }
          ]
        }
        orderby: { field: DATE, order: ASC }
      }
    ) {
      edges {
        node {
          title
          link
        }
      }
    }
  }
`;

export default graphql(allEvents, {
  options: { variables: { startDay } }
})(ListOfEvents);
