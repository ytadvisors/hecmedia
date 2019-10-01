import React from "react";
import { useQuery } from "@apollo/react-hooks";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import ListOfPosts from "../../components/ListOfPosts";
import CategoryNav from "../../components/SubNavigation/CategoryNav";
import { GET_CATEGORY_INFO } from "../../lib/graphql";

export default props => {
  const cursor = "";
  const { category } = props;
  const variables = { category, cursor };
  const { data, fetchMore } = useQuery(GET_CATEGORY_INFO, {
    variables
  });

  const { postData } = data || {};
  const posts = postData ? postData.edges.map(obj => obj && obj.node) : [];
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
      <SEO />
      <Layout>
        <CategoryNav />
        <ListOfPosts
          posts={posts}
          link={{ page: "posts" }}
          numResults={0}
          loadMore={
            posts.length % 10 === 0 && variables.cursor !== null && loadMore
          }
          resizeRows
        />
      </Layout>
    </>
  );
};
