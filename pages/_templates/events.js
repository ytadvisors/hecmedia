import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import moment from "moment";
import ListOfPosts from "../../components/ListOfPosts";
import EventNav from "../../components/SubNavigation/EventNav";
import { getArrayUnion } from "../../lib/updateFunctions";

const GET_EVENT_INFO = gql`
  query EventInfo(
    $keyEnd: String!
    $compareEnd: String!
    $keyStart: String!
    $compareStart: String!
    $after: String
  ) {
    eventData: events(
      after: $after
      where: {
        metaQuery: {
          relation: AND
          metaArray: [
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATE
              value: $compareEnd
              key: $keyEnd
            }
            {
              compare: LESS_THAN_OR_EQUAL_TO
              type: DATE
              value: $compareStart
              key: $keyStart
            }
          ]
        }
      }
    ) {
      edges {
        node {
          title(format: RENDERED)
          link
          eventDetails {
            eventDates {
              endTime
              startTime
            }
            eventImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            venue
            webAddress
            eventPrice
            externalImage
          }
          eventId
          slug
          excerpt(format: RENDERED)
        }
      }
      pageInfo {
        endCursor
      }
    }
    pageData: pageBy(uri: "events") {
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
  }
`;

export default props => {
  const getIncrVariables = (variables, adder = 1) => {
    const { keyEnd: endKey } = variables;
    const incr =
      endKey.replace(/[(event_dates|start_time|end_time)_]/gi, "") / 1 + adder;

    const keyStart = `event_dates_${incr}_start_time`;
    const keyEnd = `event_dates_${incr}_end_time`;

    return {
      ...variables,
      keyStart,
      keyEnd
    };
  };

  const runFetch = async (fetchMore, args) => {
    await fetchMore({
      query: GET_EVENT_INFO,
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

  const loadEvents = variables => {
    try {
      const { loading, error, data, fetchMore } = useQuery(GET_EVENT_INFO, {
        variables,
        fetchPolicy: "cache-and-network"
      });

      if (loading) return <p>Loading Events</p>;
      if (error) {
        return <p>Error loading Events</p>;
      }
      const args = { ...variables };
      args.after = data.eventData ? data.eventData.pageInfo.endCursor : null;
      runFetch(fetchMore, args);
      runFetch(fetchMore, getIncrVariables(args));
      runFetch(fetchMore, getIncrVariables(args, 2));
      runFetch(fetchMore, getIncrVariables(args, 3));
      return data;
    } catch (err) {
      console.log(err.message);
      return {};
    }
  };

  const { currentCategory = "All", currentDate = "" } = props;
  const incr = 0;
  const mDay = currentDate ? new Date(`${currentDate} 00:00:00`) : new Date();
  const currentDay = moment(mDay).format("YYYY-MM-DD");
  const compareStart = `${currentDay} 00:00:00`;
  const compareEnd = `${currentDay} 24:00:00`;

  const keyStart = `event_dates_${incr}_start_time`;
  const keyEnd = `event_dates_${incr}_end_time`;
  const after = "";
  const variables = { keyStart, keyEnd, compareStart, compareEnd, after };
  const values = loadEvents(variables);
  const { eventData, pageData: { feedDesign } = {} } = values;
  return (
    <>
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
    </>
  );
};
