import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import ListOfPosts from "../../components/ListOfPosts";
import DefaultNav from "../../components/SubNavigation/DefaultNav";

const GET_SEARCH_RESULTS = gql`
  query PostCategories($search: String!, $cursor: String!) {
    postData: posts(after: $cursor, where: { search: $search }) {
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

export default () => {
  const router = useRouter();
  const {
    query: { words }
  } = router;
  const variables = { search: words, cursor: "" };
  const { loading, error, data, fetchMore } = useQuery(GET_SEARCH_RESULTS, {
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

  const { postData } = data || {};
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
            loadMore={variables.cursor !== null && loadMore}
            resizeRows
          />
        </div>
      </Layout>
    </>
  );
};
