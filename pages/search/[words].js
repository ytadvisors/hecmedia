import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import ListOfPosts from "../../components/ListOfPosts";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import { getExcerpt } from "../../lib/getFunctions";
import { GET_SEARCH_RESULTS } from "../../lib/graphql";

const getContent = () => {
  const router = useRouter();
  const {
    query: { words }
  } = router;
  const variables = { search: words, cursor: "" };
  const { data, fetchMore } = useQuery(GET_SEARCH_RESULTS, {
    variables
  });

  const { postData } = data || {};
  variables.cursor = postData ? postData.pageInfo.endCursor : "";

  const loadMore = () =>
    fetchMore({
      variables,
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev;
        }

        const results = { ...fetchMoreResult };
        results.postData.edges = [
          ...prev.postData.edges,
          ...results.postData.edges
        ];
        return results;
      }
    });

  return (
    <>
      <div className="col-md-12">
        <DefaultNav
          title={`Results: ${decodeURI(words)}`}
          link={`/search/${words}`}
        />
      </div>
      <div className="col-md-12">
        <ListOfPosts
          posts={postData ? postData.edges.map(obj => obj.node) : []}
          link={{ page: "posts" }}
          numResults={0}
          design={null}
          loadMore={
            postData &&
            postData.edges.length % 10 === 0 &&
            variables.cursor !== null &&
            loadMore
          }
          resizeRows
        />
      </div>
    </>
  );
};

export default () => {
  const description = "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | Search`,
          image: "",
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: `${process.env.SITE_HOST}/search`
        }}
      />
      <Layout>{getContent()}</Layout>
    </>
  );
};
