import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import ListOfPosts from "../../components/ListOfPosts";
import DefaultNav from "../../components/SubNavigation/DefaultNav";

const GET_SEARCH_RESULTS = gql`
  query PostCategories($search: String!) {
    postData: posts(where: { search: $search }) {
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

const loadResults = variables => {
  try {
    const { loading, error, data } = useQuery(GET_SEARCH_RESULTS, {
      variables
    });

    if (loading) return <p>Loading Events</p>;
    if (error) {
      return <p>Error loading Events</p>;
    }
    return data;
  } catch (err) {
    console.log(err.message);
    return {};
  }
};

export default () => {
  const router = useRouter();
  const {
    query: { words }
  } = router;
  const results = words ? loadResults({ search: words }) : [];
  const { postData } = results || {};
  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav
            title={`Results: ${decodeURI(words)}`}
            link={`/search/${words}`}
          />
        </div>
        <div className="col-md-12">
          <ListOfPosts
            posts={postData ? postData.edges.map(obj => obj.node) : []}
            link={{ page: "posts" }}
            numResults={0}
            design={null}
            loadMore={null}
            resizeRows
          />
        </div>
      </Layout>
    </>
  );
};
