import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import Layout from "../../../containers/Layout";
import SEO from "../../../components/SEO";
import SinglePost from "../../../components/SinglePost";
import ListOfPosts from "../../../components/ListOfPosts";

const GET_EVENT_INFO = gql`
  query eventInfo($uri: String!) {
    eventData: eventBy(uri: $uri) {
      title
      content
      link
      slug
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
        eventPosts {
          eventPost {
            ... on Post {
              id
              title(format: RENDERED)
              excerpt(format: RENDERED)
              slug
              postDetails {
                videoImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                postHeader {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                isVideo
              }
              link
              categories(where: { shouldOutputInFlatList: true }) {
                edges {
                  node {
                    link
                    name
                  }
                }
              }
              postId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
      }
    }
  }
`;

const loadEvents = variables => {
  try {
    const { loading, error, data } = useQuery(GET_EVENT_INFO, {
      variables
    });

    if (loading) return <p>Loading Events</p>;
    if (error) {
      return <p>Error loading Events</p>;
    }
    return data;
  } catch (err) {
    console.log(err.message);
    return {};
  }
};

export default () => {
  const router = useRouter();
  const {
    query: { category }
  } = router;

  const data = category ? loadEvents({ uri: category }) : {};
  const { eventData } = data;
  const { eventDetails: { eventPosts } = {} } = eventData || {};

  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          {eventData && (
            <SinglePost
              {...{
                post: eventData
              }}
            />
          )}
          {eventData && eventPosts && (
            <ListOfPosts
              title="Related Posts"
              posts={
                (eventPosts &&
                  eventPosts.map(obj => obj && obj.eventPost).slice(0, 3)) ||
                []
              }
              link={{ page: "posts" }}
              numResults={0}
              style={{
                background: "#f9f9f9",
                marginBottom: "20px",
                border: "1px solid #ddd"
              }}
              design={{
                defaultRowLayout: "3 Columns",
                defaultDisplayType: "Post"
              }}
              loadMore={null}
              resizeRows
            />
          )}
        </div>
      </Layout>
    </>
  );
};
