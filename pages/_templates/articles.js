import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";

const GET_PAGE_INFO = gql`
  query PageInfo($cursor: String!) {
    postData: posts(
      after: $cursor
      where: {
        orderby: { field: DATE, order: DESC }
        metaQuery: {
          metaArray: [{ key: "is_video", value: "0", compare: EQUAL_TO }]
        }
      }
    ) {
      edges {
        node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
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
          content(format: RENDERED)
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export default () => {
  const cursor = "";
  const variables = { cursor };
  const { loading, error, data, fetchMore } = useQuery(GET_PAGE_INFO, {
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

  const { postData } = data;
  const posts = postData ? postData.edges.map(obj => obj && obj.node) : [];
  variables.cursor = postData.pageInfo.endCursor;

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
        <DefaultNav title="Articles" link="/articles" />
      </div>
      <ListOfPosts
        posts={posts}
        link={{ page: "posts" }}
        numResults={0}
        loadMore={variables.cursor !== null && loadMore}
        resizeRows
      />
    </>
  );
};
