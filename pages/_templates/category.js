import React, { useState } from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
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
  let loadMore = () => {};
  let posts = [];
  const [cursor, setCursor] = useState("");
  const loadPosts = variables => {
    try {
      const { loading, error, data, fetchMore } = useQuery(GET_CATEGORY_INFO, {
        variables
      });
      if (loading) return <p>Loading Category</p>;
      if (error) {
        return <p>Error loading Category</p>;
      }

      if (data.postData && data.postData.pageInfo) {
        loadMore = async () => {
          const { category } = props;
          await fetchMore({
            variables: { category, cursor },
            updateQuery: (prev, { fetchMoreResult }) => {
              const result = { ...fetchMoreResult };
              const { postData } = prev;
              setCursor(postData.pageInfo.endCursor);
              result.postData.edges = [
                ...postData.edges,
                ...result.postData.edges
              ];
              return result;
            }
          });
        };
      }
      const { postData } = data;
      return postData ? postData.edges.map(obj => obj && obj.node) : [];
    } catch (err) {
      return [];
    }
  };

  const { category } = props;
  posts = loadPosts({ category, cursor: "" });
  return (
    <>
      <CategoryNav />
      <ListOfPosts
        posts={posts}
        link={{ page: "posts" }}
        numResults={0}
        loadMore={loadMore}
        resizeRows
      />
    </>
  );
};
