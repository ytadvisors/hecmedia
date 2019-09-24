import App from "next/app";
import React from "react";
import { Provider } from "react-redux";
import createStore from "../store";
import withApollo from "../lib/withApollo";

import "../lib/cssDependencies";

class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps({ ctx });
    }

    return { pageProps };
  }

  render() {
    const { Component, pageProps, store } = this.props;
    return (
      <Provider store={store}>
        <Component {...pageProps} />
      </Provider>
    );
  }
}

export default createStore(withApollo(MyApp));
