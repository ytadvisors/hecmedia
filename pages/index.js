import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import Layout from "../containers/Layout";
import ListOfPosts from "../components/ListOfPosts";
import SEO from "../components/SEO";
import { removeDuplicates } from "../lib/updateFunctions";

export const GET_HOME_PAGE = gql`
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

const getContent = () => {
  const variables = { uri: "home" };
  const { loading, error, data } = useQuery(GET_HOME_PAGE, {
    variables
  });

  if (loading)
    return (
      <Layout>
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
      </Layout>
    );
  if (error) {
    return (
      <Layout>
        <p>Error loading Page</p>
      </Layout>
    );
  }

  const { pageData, postData } = data || {};
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
  );
};

export default () => (
  <>
    <SEO /> {getContent()}
  </>
);
