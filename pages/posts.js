import React from "react";

class Posts extends React.Component {
  static async getInitialProps({ query }) {
    return {
      slug: query.slug
    };
  }

  render() {
    const { slug } = this.props;
    return <h1>Post page: {slug}</h1>;
  }
}

export default Posts;
