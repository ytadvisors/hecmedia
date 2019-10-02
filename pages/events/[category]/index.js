import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import Layout from "../../../containers/Layout";
import SEO from "../../../components/SEO";
import SinglePost from "../../../components/SinglePost";
import ListOfPosts from "../../../components/ListOfPosts";
import { GET_EVENT_INFO } from "../../../lib/graphql";
import { getPostImgSrc, getExcerpt } from "../../../lib/getFunctions";

export default () => {
  const router = useRouter();
  const {
    query: { category }
  } = router;
  const variables = { uri: category };

  const { data } = useQuery(GET_EVENT_INFO, {
    variables
  });

  const { eventData } = data || {};
  const { title, content, link, eventDetails: { eventPosts } = {} } =
    eventData || {};

  const description =
    content || "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title,
          image: eventData && getPostImgSrc(eventData),
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
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
