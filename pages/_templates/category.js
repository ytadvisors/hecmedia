import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import ListOfPosts from "../../components/ListOfPosts";
import CategoryNav from "../../components/SubNavigation/CategoryNav";

const GET_CATEGORY_INFO = gql`
  query PostCategories($category: String!, $cursor: String!) {
    postData: posts(
      after: $cursor
      where: {
        taxQuery: {
          relation: OR
          taxArray: {
            taxonomy: CATEGORY
            terms: [$category]
            operator: IN
            field: SLUG
            includeChildren: true
          }
        }
        orderby: { field: DATE, order: DESC }
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
      pageInfo {
        endCursor
      }
    }
  }
`;

export default props => {
  const cursor = "";
  const { category } = props;
  const variables = { category, cursor };
  const { loading, error, data, fetchMore } = useQuery(GET_CATEGORY_INFO, {
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
      <CategoryNav />
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
