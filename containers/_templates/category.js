import React from "react";
import { useQuery } from "@apollo/react-hooks";
import SEO from "../../components/SEO";
import Layout from "../Layout";
import ListOfPosts from "../../components/ListOfPosts";
import CategoryNav from "../../components/SubNavigation/CategoryNav";
import { GET_CATEGORY_INFO } from "../../lib/graphql";
import { getExcerpt, getPostImgSrc } from "../../lib/getFunctions";

export default props => {
  const cursor = "";
  const { category, link, content } = props || {};
  const variables = { category, cursor };
  const { data, fetchMore } = useQuery(GET_CATEGORY_INFO, {
    variables
  });

  const title = category
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/-/g, " ");
  const { postData } = data || {};
  const posts = postData ? postData.edges.map(obj => obj && obj.node) : [];
  variables.cursor = postData ? postData.pageInfo.endCursor : "";
  const image = posts && posts.length > 0 ? getPostImgSrc(posts[0]) : "";

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
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, ""),
          image
        }}
      />
      <Layout>
        <CategoryNav />
        <ListOfPosts
          posts={posts}
          link={{ page: "posts" }}
          numResults={0}
          loadMore={variables.cursor !== null && loadMore}
          resizeRows
        />
      </Layout>
    </>
  );
};
