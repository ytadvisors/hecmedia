import React from "react";
import { useQuery } from "@apollo/react-hooks";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";
import { GET_ALL_MAGAZINES } from "../../lib/graphql";

export default () => {
  const cursor = "";
  const variables = { cursor };
  const { data, fetchMore } = useQuery(GET_ALL_MAGAZINES, {
    variables
  });

  const { magazineData, pageData: { feedDesign } = {} } = data || {};
  variables.cursor = magazineData ? magazineData.pageInfo.endCursor : "";

  const loadMore = () =>
    fetchMore({
      variables,
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev;
        }

        const results = { ...fetchMoreResult };
        results.magazineData.edges = [
          ...prev.magazineData.edges,
          ...results.magazineData.edges
        ];
        return results;
      }
    });

  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title="Magazines" link="/magazines" />
        </div>
        <ListOfPosts
          posts={
            magazineData ? magazineData.edges.map(obj => obj && obj.node) : []
          }
          link={{ page: "magazine" }}
          numResults={0}
          design={feedDesign}
          loadMore={
            magazineData &&
            magazineData.edges.length % 10 === 0 &&
            variables.cursor !== null &&
            loadMore
          }
        />
      </Layout>
    </>
  );
};
