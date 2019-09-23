import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import Layout from "../containers/Layout";
import ListOfPosts from "../components/ListOfPosts";
import SEO from "../components/SEO";
import { removeDuplicates } from "../lib/updateFunctions";

export const pageInfo = gql`
  query pageInfo($uri: String!) {
    pageData: pageBy(uri: $uri) {
      requiredPosts {
        postList {
          post {
            ... on Post {
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
              content(format: RENDERED)
            }
          }
        }
      }
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
    postData: posts(
      first: 10
      where: { orderby: { field: DATE, order: ASC } }
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
          content(format: RENDERED)
        }
      }
    }
  }
`;

const Index = ({ data: { pageData, postData } }) => {
  const { requiredPosts: { postList = [] } = {}, feedDesign } = pageData || {};
  let pagePosts = [];
  if (postData && postData.edges) {
    pagePosts = [
      ...postList.map(obj => obj.post),
      ...postData.edges.map(obj => obj.node)
    ];
    pagePosts = removeDuplicates(pagePosts, "postId");
    pagePosts = removeDuplicates(pagePosts, "postId");
    pagePosts = pagePosts.splice(0, 10);
  }
  return (
    <>
      <SEO />
      <Layout showBottomNav>
        <ListOfPosts
          posts={pagePosts}
          link={{ page: "posts" }}
          numResults={0}
          design={feedDesign}
          loadMore={null}
          resizeRows
        />
      </Layout>
    </>
  );
};

export default graphql(pageInfo, {
  options: { variables: { uri: "home" } }
})(Index);
