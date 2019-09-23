import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import ListOfPosts from "../../components/ListOfPosts";
import CategoryNav from "../../components/SubNavigation/CategoryNav";

const GET_CATEGORY_INFO = gql`
  query PostCategories($category: String!) {
    postData: posts(
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
    }
  }
`;

const loadPosts = variables => {
  try {
    const { loading, error, data } = useQuery(GET_CATEGORY_INFO, {
      variables
    });
    if (loading) return <p>Loading Category</p>;
    if (error) {
      return <p>Error loading Category</p>;
    }
    return data;
  } catch (err) {
    return {};
  }
};

export default props => {
  const { category } = props;
  const { postData } = category ? loadPosts({ category }) : {};
  return (
    <>
      <CategoryNav />
      <ListOfPosts
        posts={postData ? postData.edges.map(obj => obj && obj.node) : []}
        link={{ page: "posts" }}
        numResults={0}
        loadMore={null}
        resizeRows
      />
    </>
  );
};
