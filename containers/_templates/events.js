import React from "react";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import SEO from "../../components/SEO";
import Layout from "../Layout";
import ListOfPosts from "../../components/ListOfPosts";
import EventNav from "../../components/SubNavigation/EventNav";
import { getArrayUnion } from "../../lib/updateFunctions";
import { getPostImgSrc, getExcerpt } from "../../lib/getFunctions";
import { GET_EVENTS_BY_DAY } from "../../lib/graphql";

export default props => {
  const runFetch = async (fetchMore, args) => {
    await fetchMore({
      query: GET_EVENTS_BY_DAY,
      variables: args,
      updateQuery: (prev, updateProps) => {
        const { fetchMoreResult } = updateProps;
        let updateArray = prev;
        const numResults = fetchMoreResult.eventData.edges.length;
        if (fetchMoreResult && numResults > 0) {
          updateArray = getArrayUnion(
            prev,
            fetchMoreResult,
            "eventData",
            "node.eventId"
          );
        }
        return updateArray;
      }
    });
  };

  const {
    currentCategory = "All",
    currentDate = "",
    title = "Events",
    link = "/events",
    content
  } = props || {};
  const mDay = currentDate ? new Date(`${currentDate} 00:00:00`) : new Date();
  const currentDay = moment(mDay).format("YYYY-MM-DD");

  const dayStart = `${currentDay} 00:00:00`;
  const dayEnd = `${currentDay} 23:59:59`;
  const keyStart = `event_dates_$_start_time`;
  const keyEnd = `event_dates_$_end_time`;
  const after = "";

  const variables = { keyStart, keyEnd, dayStart, dayEnd, after };
  const { data, fetchMore } = useQuery(GET_EVENTS_BY_DAY, {
    variables
  });

  const { eventData, pageData: { feedDesign } = {} } = data || {};
  variables.after = eventData ? eventData.pageInfo.endCursor : null;
  if (fetchMore) {
    runFetch(fetchMore, variables);
  }

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
        {eventData && eventData.edges.length > 0 && (
          <ListOfPosts
            posts={eventData ? eventData.edges.map(obj => obj.node) : []}
            link={{ page: "events" }}
            numResults={0}
            design={feedDesign}
            loadMore={null}
            resizeRows
          />
        )}
        {!eventData ||
          (eventData.edges.length <= 0 && (
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
