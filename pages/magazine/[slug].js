import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { useRouter } from "next/router";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import SinglePost from "../../components/SinglePost";
import ListOfPosts from "../../components/ListOfPosts";

const GET_MAGAZINE_INFO = gql`
  query magazineInfo($slug: String!) {
    magazine: magazineBy(slug: $slug) {
      magazineId
      link
      slug
      title
      content
      magazineDetail {
        coverImage {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        magazinePost {
          post {
            ... on Post {
              id
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
  const loadMagazines = variables => {
    try {
      const { loading, error, data } = useQuery(GET_MAGAZINE_INFO, {
        variables
      });

      if (loading) return <p>Loading Magazine</p>;
      if (error) {
        return <p>Error loading Magazine</p>;
      }
      return data;
    } catch (err) {
      console.log(err.message);
      return {};
    }
  };
  const router = useRouter();
  const {
    query: { slug }
  } = router;

  const { magazine } = loadMagazines({ slug });
  const { magazineDetail: { magazinePost } = {} } = magazine || {};
  return (
    <>
      <SEO />
      <Layout style={{ background: "#eee" }}>
        <div className="col-md-12" style={{ background: "#eee" }}>
          <SinglePost
            {...{
              post: magazine,
              classes: {
                thumbnail: "col-md-2 pull-right",
                content: "col-md-10 no-padding"
              }
            }}
          />
          <ListOfPosts
            posts={magazinePost ? magazinePost.map(obj => obj.post) : []}
            link={{ page: "posts" }}
            numResults={0}
            design={{
              defaultRowLayout: "2 Columns",
              defaultDisplayType: "Post"
            }}
            loadMore={null}
            style={{
              background: "#f9f9f9",
              border: "1px solid #ddd"
            }}
            resizeRows
          />
        </div>
      </Layout>
    </>
  );
};
