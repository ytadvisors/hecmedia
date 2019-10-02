import React from "react";
import { useQuery } from "@apollo/react-hooks";
import { useRouter } from "next/router";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import SinglePost from "../../components/SinglePost";
import ListOfPosts from "../../components/ListOfPosts";
import { getPostImgSrc, getExcerpt } from "../../lib/getFunctions";
import { GET_MAGAZINE_INFO } from "../../lib/graphql";

export default () => {
  const router = useRouter();
  const {
    query: { slug }
  } = router;
  const variables = { slug };
  const { data } = useQuery(GET_MAGAZINE_INFO, {
    variables
  });

  const { magazine } = data || {};
  const { title, link, content, magazineDetail: { magazinePost } = {} } =
    magazine || {};
  const description =
    content || "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title,
          image: getPostImgSrc(magazine),
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
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
          {magazinePost && (
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
          )}
        </div>
      </Layout>
    </>
  );
};
