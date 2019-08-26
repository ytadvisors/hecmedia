import React, { Component } from "react";

export default class Category extends Component {
  static async getInitialProps({ query }) {
    return {
      proxy: query.proxy
    };
  }

  render() {
    const { proxy } = this.props;
    return <h1>Category page: {proxy}</h1>;
  }
}
