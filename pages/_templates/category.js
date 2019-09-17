import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import ListOfPosts from "../../components/ListOfPosts";
import CategoryNav from "../../components/SubNavigation/CategoryNav";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";

const pageInfo = gql`
  query pageInfo($category: String!) {
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

export default props => {
  const loadPosts = variables => {
    try {
      const { loading, error, data } = useQuery(pageInfo, {
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

  const { category } = props;
  const { postData } = category ? loadPosts({ category }) : {};
  return (
    <>
      <SEO />
      <Layout>
        <CategoryNav />
        <ListOfPosts
          posts={postData ? postData.edges.map(obj => obj.node) : []}
          link={{ page: "posts" }}
          numResults={0}
          loadMore={null}
          resizeRows
        />
      </Layout>
    </>
  );
};
