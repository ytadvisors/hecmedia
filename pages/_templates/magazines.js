import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";

const GET_MAGAZINES = gql`
  query MagazineList($cursor: String!) {
    magazineData: magazines(after: $cursor) {
      edges {
        node {
          magazineId
          link
          slug
          title
          magazineDetail {
            coverImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
          }
        }
      }
      pageInfo {
        endCursor
      }
    }
    pageData: pageBy(uri: "magazines") {
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
  const cursor = "";
  const variables = { cursor };
  const { loading, error, data, fetchMore } = useQuery(GET_MAGAZINES, {
    variables
  });

  if (loading)
    return (
      <div className="loading">
        <ScaleLoader
          sizeUnit="px"
          size={150}
          color="#0065bc"
          loading
          height={55}
          width={10}
        />
      </div>
    );
  if (error) {
    return <p>Error loading Category</p>;
  }

  const { magazineData, pageData: { feedDesign } = {} } = data;
  variables.cursor = magazineData.pageInfo.endCursor;

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
          magazineData.edges.length % 10 === 0 &&
          variables.cursor !== null &&
          loadMore
        }
      />
    </>
  );
};
