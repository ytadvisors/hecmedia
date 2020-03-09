import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { GET_HOME_PAGE } from "../lib/graphql";
import Layout from "../containers/Layout";
import ListOfPosts from "../components/ListOfPosts";
import SEO from "../components/SEO";
import { removeDuplicates } from "../lib/updateFunctions";
import { getPostImgSrc, getExcerpt } from "../lib/getFunctions";

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
    feedDesign
  } = pageData || {};
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
      <Layout showBottomNav>
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
