import React from "react";
import { useQuery } from "@apollo/react-hooks";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";
import { GET_ARTICLES } from "../../lib/graphql";
import { getPostImgSrc, getExcerpt } from "../../lib/getFunctions";

export default props => {
  const cursor = "";
  const variables = { cursor };
  const { data, fetchMore } = useQuery(GET_ARTICLES, {
    variables
  });

  const { title, link, content } = props || {};
  const { postData } = data || {};
  const posts = postData ? postData.edges.map(obj => obj && obj.node) : [];
  variables.cursor = postData ? postData.pageInfo.endCursor : "";

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

  const description =
    content || "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          image: getPostImgSrc(posts[0]),
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title="Articles" link="/articles" />
        </div>
        <ListOfPosts
          posts={posts}
          link={{ page: "posts" }}
          numResults={0}
          loadMore={
            posts.length % 10 === 0 && variables.cursor !== null && loadMore
          }
          resizeRows
        />
      </Layout>
    </>
  );
};
