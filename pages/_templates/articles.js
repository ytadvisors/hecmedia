import React from "react";
import { graphql } from "react-apollo";
import gql from "graphql-tag";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";

const GET_PAGE_INFO = gql`
  query PageInfo {
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
    </>
  );
};

export default graphql(GET_PAGE_INFO)(Articles);
