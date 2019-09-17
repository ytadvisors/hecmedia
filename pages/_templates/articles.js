import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import Layout from "../../containers/Layout";
import ListOfPosts from "../../components/ListOfPosts";
import SEO from "../../components/SEO";

const pageInfo = gql`
  query pageInfo {
    postData: posts(
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
    }
  }
`;

const Articles = ({ data: { postData } }) => {
  let pagePosts = [];
  if (postData && postData.edges) {
    pagePosts = postData.edges.map(obj => obj.node);
  }
  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title="Articles" link="/articles" />
        </div>
        <ListOfPosts
          posts={pagePosts}
          link={{ page: "posts" }}
          numResults={0}
          loadMore={null}
          resizeRows
        />
      </Layout>
    </>
  );
};

export default graphql(pageInfo)(Articles);
