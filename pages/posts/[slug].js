import React, { useState, useEffect } from "react";
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
  const [relatedResults, setRelatedResults] = useState([]);
  const router = useRouter();
  const {
    query: { slug }
  } = router;
  const variables = { slug };

  const { data, fetchMore } = useQuery(GET_PAGE_INFO, {
    variables
  });

  const { post, podcasts } = data || {};
  const { categories, postDetails, title, excerpt, content, link } = post || {};
  const { relatedPosts } = postDetails || {};
  let result = { ...data };
  let categoryList = [];
  if (postDetails) {
    if (categories && categories.edges) {
      categoryList = categories.edges.map(obj => obj.node.categoryId);
    }
  }

  const loadMore = () =>
    fetchMore &&
    fetchMore({
      query: GET_PAGE_CATEGORY,
      variables: { categories: categoryList },
      updateQuery: (prev, { fetchMoreResult }) => {
        result = { ...prev };
        if (prev && fetchMoreResult) {
          const { categoryPosts } = fetchMoreResult;
          if (categoryPosts && categoryPosts.edges) {
            setRelatedResults(
              [...relatedResults, ...categoryPosts.edges].filter(n =>
                n.relatedPost ? n : null
              )
            );
          }
        }
        setCount(count + 1);
        return result;
      }
    });

  useEffect(() => {
    if (relatedPosts && relatedPosts.length > 0) {
      setRelatedResults(relatedPosts.filter(n => (n.relatedPost ? n : null)));
    }
    if (categoryList && relatedResults.length < 3)
      if (categoryList.length > 0) {
        loadMore();
      }
  }, [categoryList]);

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
          {result.post && relatedResults && relatedResults.length > 0 && (
            <ListOfPosts
              title="Related Posts"
              posts={
                relatedResults.map(obj => obj && obj.relatedPost).slice(0, 3) ||
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
