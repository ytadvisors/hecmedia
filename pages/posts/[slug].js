import React, { useState } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import SinglePost from "../../components/SinglePost";
import ListOfPosts from "../../components/ListOfPosts";
import { getPostImgSrc, getExcerpt } from "../../lib/getFunctions";
import { GET_PAGE_INFO, GET_PAGE_CATEGORY } from "../../lib/graphql";

const Posts = props => {
  const { playingLive } = props;
  const [count, setCount] = useState(0);
  const router = useRouter();
  const {
    query: { slug }
  } = router;

  const variables = { slug };
  const { data, fetchMore } = useQuery(GET_PAGE_INFO, {
    variables,
    notifyOnNetworkStatusChange: true
  });

  const { post, podcasts } = data || {};
  const { categories, postDetails, title, excerpt, content, link } = post || {};
  const { relatedPosts } = postDetails || {};
  let result = { ...data };
  let currentPosts = [];
  if (postDetails) {
    if (categories && categories.edges) {
      const categoryList = categories.edges.map(obj => obj.node.categoryId);
      if (!relatedPosts || relatedPosts.length < 3) {
        fetchMore({
          query: GET_PAGE_CATEGORY,
          variables: { categories: categoryList },
          updateQuery: (prev, { fetchMoreResult }) => {
            result = prev;
            if (prev && fetchMoreResult) {
              if (!result.post.postDetails.relatedPosts)
                result.post.postDetails.relatedPosts = [];

              const { categoryPosts } = fetchMoreResult;
              currentPosts = result.post.postDetails.relatedPosts;
              if (categoryPosts && categoryPosts.edges) {
                currentPosts = [...currentPosts, ...categoryPosts.edges];
                result.post.postDetails.relatedPosts = currentPosts;
              }
            }
            setCount(count + 1);
            return result;
          }
        });
      }

      if (result.post.postDetails.relatedPosts)
        result.post.postDetails.relatedPosts = result.post.postDetails.relatedPosts.filter(
          n => (n.relatedPost ? n : null)
        );
    }
  }

  const description =
    excerpt || content || "On Demand Arts, Culture & Education Programming";
  const categoryNames =
    categories && categories.edges.map(obj => obj.node.name);

  return (
    <>
      <SEO
        {...{
          title,
          image: getPostImgSrc(result.post),
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, ""),
          categories: categoryNames
        }}
      />
      <Layout>
        <div className="col-md-12" style={{ background: "#eee" }}>
          {result.post && (
            <SinglePost
              {...{
                post: result.post,
                showShareIcons: true,
                podcasts,
                playingLive
              }}
            />
          )}
          {result.post && result.post.postDetails.relatedPosts && (
            <ListOfPosts
              title="Related Posts"
              posts={
                (result.post.postDetails.relatedPosts &&
                  result.post.postDetails.relatedPosts
                    .map(obj => obj && obj.relatedPost)
                    .slice(0, 3)) ||
                []
              }
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
          {result.post && result.post.postDetails.postEvents && (
            <ListOfPosts
              title="Related Events"
              posts={
                (result.post.postDetails.postEvents &&
                  result.post.postDetails.postEvents.map(
                    obj => obj && obj.relatedEvent
                  )) ||
                []
              }
              link={{ page: "events" }}
              numResults={0}
              design={{
                defaultRowLayout: "Single Column",
                defaultDisplayType: "Wallpaper"
              }}
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

export default connect(mapStateToProps)(Posts);
