import React, { useMemo } from "react";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import SEO from "../../components/SEO";
import Layout from "../Layout";
import ListOfPosts from "../../components/ListOfPosts";
import EventNav from "../../components/SubNavigation/EventNav";
import { getPostImgSrc, getExcerpt } from "../../lib/getFunctions";
import { getQueryUpdate } from "../../lib/updateFunctions";
import { GET_EVENTS_BY_DAY } from "../../lib/graphql";

export default props => {
  const {
    currentCategory = "All",
    currentDate = "",
    title = "Events",
    link = "/events",
    content
  } = props || {};

  let mDay = new Date();
  if (currentDate) {
    const [yyyy, mm, dd] = currentDate.split("-");
    mDay = new Date(yyyy, mm - 1, dd, "00", "00", "01");
  }

  const momentDay = moment(mDay);
  const currentDay = momentDay.format("YYYY-MM-DD");
  const dayEnd = `${currentDay} 00:00:00`;
  const keyEnd = `event_dates_$_end_time`;

  const variables = { keyEnd, dayEnd, cursor: "" };
  const { data, fetchMore } = useQuery(GET_EVENTS_BY_DAY, {
    variables,
    notifyOnNetworkStatusChange: true
  });

  const { matchEvent, pageData: { feedDesign } = {} } = data || {};
  const { nodes: eventList, pageInfo: { endCursor: cursor } = {} } =
    matchEvent || {};
  const eventData =
    eventList &&
    eventList
      .map(event => {
        const { eventDetails: { eventDates = [] } = {} } = event || {};
        const matches =
          eventDates &&
          eventDates
            .map(evnt => {
              const { endTime, startTime } = evnt;
              if (endTime && startTime) {
                const startDay = `${moment(startTime).format(
                  "MM/DD/YYYY"
                )} 00:00:00`;
                const endDay = `${moment(endTime).format(
                  "MM/DD/YYYY"
                )} 23:59:59`;
                if (
                  momentDay.isBetween(
                    moment(new Date(startDay)),
                    moment(new Date(endDay))
                  )
                ) {
                  return true;
                }
              }
              return null;
            })
            .filter(x => x);
        if (matches && matches.length > 0) return event;
        return null;
      })
      .filter(n => n);

  const loadMore = () =>
    fetchMore
      ? fetchMore({
          query: GET_EVENTS_BY_DAY,
          variables: {
            keyEnd,
            dayEnd,
            cursor
          },
          updateQuery: (prev, fetchData) =>
            getQueryUpdate(prev, fetchData, "matchEvent")
        })
      : {};

  useMemo(() => {
    if (cursor) loadMore();
  }, [cursor]);

  const image =
    eventData && eventData.length > 0 ? getPostImgSrc(eventData[0]) : "";
  const description =
    content || "On Demand Arts, Culture & Education Programming";
  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          image,
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
      <Layout>
        <div className="col-md-12">
          <EventNav
            link="/events"
            currentDate={mDay}
            currentCategory={currentCategory}
            selectTitle="Filter Events"
            title="Events"
          />
        </div>
        {eventData && eventData.length > 0 && (
          <ListOfPosts
            posts={eventData}
            link={{ page: "events" }}
            numResults={0}
            design={feedDesign}
            loadMore={null}
            resizeRows
          />
        )}
        {!eventData ||
          (eventData && eventData.length <= 0 && (
            <div className="col-md-12">
              <p>
                No Events to display. You can change the date above to find
                events.
              </p>
            </div>
          ))}
      </Layout>
    </>
  );
};
