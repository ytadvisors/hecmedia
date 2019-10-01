import App from "next/app";
import React from "react";
import { Provider } from "react-redux";
import { ApolloProvider } from "@apollo/react-hooks";
import withApollo from "../lib/withApollo";
import createStore from "../store";

import "../lib/cssDependencies";

class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps({ ctx });
    }
    pageProps.query = ctx.query;
    return { pageProps };
  }

  render() {
    const { Component, pageProps, store, apolloClient } = this.props;
    return (
      <Provider store={store}>
        <ApolloProvider client={apolloClient}>
          <Component {...pageProps} />
        </ApolloProvider>
      </Provider>
    );
  }
}

export default createStore(withApollo(MyApp));
