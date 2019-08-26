import React, { Component } from "react";

export default class Posts extends Component {
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
