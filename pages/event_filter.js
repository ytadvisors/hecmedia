import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import moment from "moment";
import { Router } from "../routes";
import ListOfPosts from "../components/ListOfPosts";
import EventNav from "../components/SubNavigation/EventNav";
import Layout from "../containers/Layout";
import SEO from "../components/SEO";
import { getArrayUnion } from "../lib/updateFunctions";

export const eventInfo = gql`
  query eventInfo(
    $keyStart: String!
    $keyEnd: String!
    $compareStart: String!
    $compareEnd: String!
    $after: String
  ) {
    eventData: events(
      after: $after
      where: {
        metaQuery: {
          relation: AND
          metaArray: [
            {
              compare: LESS_THAN_OR_EQUAL_TO
              type: DATETIME
              value: $compareEnd
              key: $keyEnd
            }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              type: DATETIME
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

export default () => {
  const mDay = moment(new Date());
  const currentDay = moment(mDay).format("YYYY-MM-DD");
  const router = useRouter();
  const {
    query: { proxy = "" }
  } = router;
  const proxyData = proxy.split("/");
  const [eCategory = "All", eDate = currentDay] = proxyData;

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

  const changeDate = newDate => {
    Router.pushRoute(
      `/event_filter/${eCategory}/${newDate.format("YYYY-MM-DD")}`
    );
  };

  const changeCategory = newCategory => {
    Router.pushRoute(`/event_filter/${newCategory}/${eDate}`);
  };

  const runFetch = async (fetchMore, args) => {
    await fetchMore({
      query: eventInfo,
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
      const { loading, error, data, fetchMore } = useQuery(eventInfo, {
        variables
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

  const incr = 0;
  const compareStart = `2019-08-04 00:00:00`;
  const compareEnd = `2019-09-04 24:00:00`;

  const keyStart = `event_dates_${incr}_start_time`;
  const keyEnd = `event_dates_${incr}_end_time`;
  const after = "";
  const variables = { keyStart, keyEnd, compareStart, compareEnd, after };
  const props = loadEvents(variables);
  const { eventData: eData, pageData: { feedDesign } = {} } = props;
  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <EventNav
            link="/events"
            changeDate={changeDate}
            changeCategory={changeCategory}
            selectTitle="Filter Events"
            title="Events"
          />
        </div>
        <ListOfPosts
          posts={eData ? eData.edges.map(obj => obj.node) : []}
          link={{ page: "events" }}
          numResults={0}
          design={feedDesign}
          loadMore={null}
          resizeRows
        />
      </Layout>
    </>
  );
};
