import App from "next/app";
import React from "react";
import { Provider } from "react-redux";
import Router from "next/router";
import createStore from "../store";
import withApollo from "../lib/withApollo";

class MyApp extends App {
  constructor() {
    super();
    Router.events.on("routeChangeComplete", () => {
      if (process.env.NODE_ENV !== "production") {
        const els = document.querySelectorAll(
          'link[href*="/_next/static/css/styles.chunk.css"]'
        );
        const timestamp = new Date().valueOf();
        els[0].href = `/_next/static/css/styles.chunk.css?v=${  timestamp}`;
      }
    });
  }

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
