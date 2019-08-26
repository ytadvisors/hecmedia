import React, { Component } from "react";

export default class Magazine extends Component {
  static async getInitialProps({ query }) {
    return {
      slug: query.slug
    };
  }

  render() {
    const { slug } = this.props;
    return <h1>Magazine page: {slug}</h1>;
  }
}
