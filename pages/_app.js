import App from "next/app";
import React from "react";
import { Provider } from "react-redux";
import { ApolloProvider } from "@apollo/react-hooks";
import Head from "next/head";
import Router from "next/router";
import "react-datepicker/dist/react-datepicker.css";
import withApollo from "../lib/withApollo";
import createStore from "../store";
import { markClientNavigation } from "../lib/reviewedContentScripts";

import "../lib/cssDependencies.scss";

class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps({ ctx });
    }
    return { pageProps };
  }

  componentDidMount() {
    Router.events.on("routeChangeStart", markClientNavigation);
  }

  componentWillUnmount() {
    Router.events.off("routeChangeStart", markClientNavigation);
  }

  render() {
    const { Component, pageProps, store, apolloClient } = this.props;
    return (
      <Provider store={store}>
        <ApolloProvider client={apolloClient}>
          <Head>
            <meta
              name="hecmedia-deploy-sha"
              content={process.env.DEPLOY_SHA || "local"}
            />
            <meta
              name="hecmedia-forms-mode"
              content={process.env.HECMEDIA_NO_SEND_FORMS || "send"}
            />
          </Head>
          <Component {...pageProps} />
        </ApolloProvider>
      </Provider>
    );
  }
}

export default createStore(withApollo(MyApp));
