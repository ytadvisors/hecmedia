import React from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import SinglePost from "../../components/SinglePost";
import ListOfPosts from "../../components/ListOfPosts";
import { getPostPageImgSrc, getExcerpt } from "../../lib/getFunctions";
import { GET_PAGE_INFO, GET_PAGE_CATEGORY } from "../../lib/graphql";
import { resolvePostSlugRedirect } from "../../lib/post-slug-redirects";
import selectRelatedPosts from "../../lib/relatedPosts";
import postDetailQueryOptions from "../../lib/postDetailQueryOptions";

const Posts = props => {
  const { playingLive } = props;
  const router = useRouter();
  const {
    query: { slug }
  } = router;

  const { data } = useQuery(GET_PAGE_INFO, postDetailQueryOptions(slug));

  const { post, podcasts } = data || {};
  const { categories, postDetails, title, excerpt, content, link } = post || {};
  const categoryList =
    (categories && categories.edges.map(obj => obj.node.categoryId)) || [];
  const { data: categoryData } = useQuery(GET_PAGE_CATEGORY, {
    variables: { categories: categoryList },
    skip: !post || categoryList.length === 0,
    notifyOnNetworkStatusChange: true
  });
  const categoryFallback =
    (categoryData &&
      categoryData.categoryPosts &&
      categoryData.categoryPosts.edges) ||
    [];
  const relatedPostNodes = selectRelatedPosts({
    currentPost: post,
    categoryIds: categoryList,
    editorial: (postDetails && postDetails.relatedPosts) || [],
    fallback: categoryFallback
  });

  const description =
    excerpt || content || "On Demand Arts, Culture & Education Programming";
  const categoryNames =
    categories && categories.edges.map(obj => obj.node.name);

  return (
    <>
      <SEO
        {...{
          title,
          image: getPostPageImgSrc(post),
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, ""),
          categories: categoryNames
        }}
      />
      <Layout>
        <div className="col-md-12" style={{ background: "#eee" }}>
          {post && (
            <SinglePost
              {...{
                post,
                showShareIcons: true,
                podcasts,
                playingLive
              }}
            />
          )}
          {post && relatedPostNodes.length > 0 && (
            <ListOfPosts
              title="Related Posts"
              posts={relatedPostNodes}
              link={{ page: "posts" }}
              numResults={0}
              style={{
                background: "#f9f9f9",
                marginBottom: "20px",
                border: "1px solid #ddd"
              }}
              design={{
                defaultRowLayout: "3 Columns",
                defaultDisplayType: "Post"
              }}
              loadMore={null}
              resizeRows
            />
          )}
        </div>
      </Layout>
    </>
  );
};

const mapStateToProps = state => ({
  playingLive: state.postReducers.playingLive
});

const ConnectedPosts = connect(mapStateToProps)(Posts);

/**
 * SSR belt-and-suspenders for permanent slug renames. next.config.js also
 * emits these as redirects(); this covers Lambda@Edge SSR entry when the
 * config map is not applied by the packaging path.
 */
ConnectedPosts.getInitialProps = async ctx => {
  const dest = resolvePostSlugRedirect(ctx?.query?.slug);
  if (!dest) return {};
  if (ctx.res) {
    ctx.res.writeHead(301, { Location: dest });
    ctx.res.end();
  }
  return {};
};

export default ConnectedPosts;
