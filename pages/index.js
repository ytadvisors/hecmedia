import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/react-hooks";
import { GET_HOME_PAGE } from "../lib/graphql";
import Layout from "../containers/Layout";
import ListOfPosts from "../components/ListOfPosts";
import SEO from "../components/SEO";
import { removeDuplicates } from "../lib/updateFunctions";
import { getPostImgSrc, getExcerpt } from "../lib/getFunctions";
import {
  fetchPageAcfLayout,
  hasFeedRowLayout,
  resolveFeedDesign
} from "../lib/homeFeedDesign";

export default () => {
  const { data } = useQuery(GET_HOME_PAGE, {
    variables: { uri: "home" },
    notifyOnNetworkStatusChange: true
  });
  const { pageData, postData } = data || {};
  const {
    title,
    content,
    link,
    requiredPosts: { postList = [] } = {},
    feedDesign: graphqlFeedDesign
  } = pageData || {};

  // When GraphQL Page.feedDesign.newRowLayout is empty (staging resolver bug
  // reading the wrong meta key), hydrate layout rows from public REST ACF so
  // ListOfPosts can render Featured / 3 Columns / Wallpaper blocks.
  const [restLayout, setRestLayout] = useState(null);
  useEffect(() => {
    if (hasFeedRowLayout(graphqlFeedDesign)) return undefined;
    let cancelled = false;
    fetchPageAcfLayout("home").then(result => {
      if (!cancelled && result) setRestLayout(result);
    });
    return () => {
      cancelled = true;
    };
  }, [graphqlFeedDesign]);

  const feedDesign = resolveFeedDesign(
    graphqlFeedDesign,
    restLayout && restLayout.feedDesign
  );

  const description =
    content || "On Demand Arts, Culture & Education Programming";

  let pagePosts = [];
  let image = "";
  if (postData && postData.edges) {
    pagePosts = [
      ...postList.map(obj => obj.post),
      ...postData.edges.map(obj => obj.node)
    ];
    pagePosts = removeDuplicates(pagePosts, "postId");
    pagePosts = removeDuplicates(pagePosts, "postId");
    pagePosts = pagePosts.splice(0, 15);
    image = getPostImgSrc(pagePosts[0]);
  }
  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          image,
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
      <Layout showBottomNav railFirstOnMobile>
        <ListOfPosts
          posts={pagePosts}
          link={{ page: "posts" }}
          numResults={0}
          design={feedDesign}
          loadMore={null}
          addNewsLetter
          resizeRows
        />
      </Layout>
    </>
  );
};
