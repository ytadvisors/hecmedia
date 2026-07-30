import React from "react";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { GET_CURRENT_EVENTS } from "../../lib/graphql";

export default () => {
  const mDay = moment(new Date());
  const currentDay = moment(mDay).format("YYYY-MM-DD");

  const dayEnd = `${currentDay} 00:00:00`;
  const keyEnd = `event_dates_$_end_time`;

  const variables = { keyEnd, dayEnd };
  const { data } = useQuery(GET_CURRENT_EVENTS, {
    variables
  });

  const { currentEvents } = data || {};

  return (
    <section className="list-of-events">
      <div className="title">
        <div>
          <h4>Things to do in St. Louis</h4>
        </div>
      </div>
      <ul className="event-list">
        {currentEvents &&
          currentEvents.edges.map((event, x) => {
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
                  <a href={link.replace(/https?:\/\/[^/]+/, "")}>Read More</a>
                </li>
              )
            );
          })}
      </ul>
    </section>
  );
};
