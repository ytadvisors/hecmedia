import React from "react";
import { useQuery } from "@apollo/react-hooks";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";
import { GET_ALL_MAGAZINES } from "../../lib/graphql";
import { getExcerpt, getPostImgSrc } from "../../lib/getFunctions";

export default props => {
  const cursor = "";
  const { title = "", link, content } = props || {};
  const variables = { cursor };
  const { data, fetchMore } = useQuery(GET_ALL_MAGAZINES, {
    variables
  });

  const description =
    content || "On Demand Arts, Culture & Education Programming";

  const { magazineData, pageData: { feedDesign } = {} } = data || {};
  variables.cursor = magazineData ? magazineData.pageInfo.endCursor : "";

  const loadMore = () =>
    fetchMore({
      variables,
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev;
        }

        const results = { ...fetchMoreResult };
        results.magazineData.edges = [
          ...prev.magazineData.edges,
          ...results.magazineData.edges
        ];
        return results;
      }
    });

  const posts = magazineData
    ? magazineData.edges.map(obj => obj && obj.node)
    : [];
  const image = posts.length > 0 ? getPostImgSrc(posts[0]) : "";

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
        <div className="col-md-12">
          <DefaultNav title="Magazines" link="/magazines" />
        </div>
        <ListOfPosts
          posts={posts}
          link={{ page: "magazine" }}
          numResults={0}
          design={feedDesign}
          loadMore={
            magazineData &&
            magazineData.edges.length % 10 === 0 &&
            variables.cursor !== null &&
            loadMore
          }
        />
      </Layout>
    </>
  );
};
