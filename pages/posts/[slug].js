import React, { Component } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import SinglePost from "../../components/SinglePost";
import ListOfPosts from "../../components/ListOfPosts";

const GET_PAGE_CATEGORY = gql`
  query categoryPost($categories: [ID]) {
    categoryPosts: posts(
      first: 3
      where: { categoryIn: $categories, orderby: { field: DATE, order: DESC } }
    ) {
      edges {
        relatedPost: node {
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
    }
  }
`;

const GET_PAGE_INFO = gql`
  query currentPost($slug: String!) {
    post: postBy(slug: $slug) {
      title
      content
      link
      categories(where: { shouldOutputInFlatList: true }) {
        edges {
          node {
            link
            name
            categoryId
          }
        }
      }
      postDetails {
        youtubeId
        showPodcasts
        vimeoId
        embedUrl
        isVideo
        postHeader {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        relatedPosts {
          relatedPost {
            ... on Post {
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
        }
        postEvents {
          relatedEvent {
            ... on Event {
              id
              title
              eventDetails {
                eventDates {
                  endTime
                  startTime
                }
                eventImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                venue
                webAddress
                eventPrice
                externalImage
              }
              link
              eventId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
      }
    }
  }
`;

const PostList = ({ updateData }) => {
  const loadPosts = variables => {
    try {
      const { loading, error, data, fetchMore } = useQuery(GET_PAGE_INFO, {
        variables
      });
      if (loading) return <p>Loading Posts</p>;

      if (error) {
        return <p>Error loading posts</p>;
      }

      const { post } = data;
      const { categories, postDetails } = post;
      const { relatedPosts } = postDetails || {};
      if (postDetails) {
        if (categories && categories.edges) {
          const categoryList = categories.edges.map(obj => obj.node.categoryId);
          if (!relatedPosts || relatedPosts.length < 3) {
            fetchMore({
              query: GET_PAGE_CATEGORY,
              variables: { categories: categoryList },
              updateQuery: (prev, { fetchMoreResult }) => {
                const result = { ...prev };
                const { categoryPosts } = fetchMoreResult;
                let currentPosts = prev.post.postDetails.relatedPosts || [];
                if (categoryPosts && categoryPosts.edges) {
                  currentPosts = [...currentPosts, ...categoryPosts.edges];
                }
                if (currentPosts)
                  result.post.postDetails.relatedPosts = currentPosts;
                updateData({
                  data: result
                });
                return result;
              }
            });
          }
        }

        data.post.postDetails.relatedPosts = data.post.postDetails.relatedPosts.filter(
          n => (n.relatedPost ? n : null)
        );
      }
      return data;
    } catch (err) {
      console.log(err.message);
      return {};
    }
  };

  const router = useRouter();
  const {
    query: { slug }
  } = router;
  const data = slug ? loadPosts({ slug }) : {};
  const { post } = data;
  const { postDetails: { relatedPosts, postEvents } = {} } = post || {};
  return (
    <div>
      {post && (
        <SinglePost
          {...{
            post,
            showShareIcons: true
          }}
        />
      )}
      {post && relatedPosts && (
        <ListOfPosts
          title="Related Posts"
          posts={
            (relatedPosts &&
              relatedPosts.map(obj => obj && obj.relatedPost).slice(0, 3)) ||
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
      {post && postEvents && (
        <ListOfPosts
          title="Related Events"
          posts={
            (postEvents && postEvents.map(obj => obj && obj.relatedEvent)) || []
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
  );
};

export default class extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {}
    };
  }

  updateData = data =>
    this.setState({
      data
    });

  render() {
    const { data } = this.state;
    return (
      <>
        <SEO />
        <Layout>
          <div className="col-md-12" style={{ background: "#eee" }}>
            <PostList updateData={this.updateData} data={data} />
          </div>
        </Layout>
      </>
    );
  }
}
