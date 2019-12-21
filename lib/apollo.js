import React, { useMemo } from "react";
import Head from "next/head";
import { getDataFromTree } from "@apollo/react-ssr";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { RetryLink } from "apollo-link-retry";
import { ApolloLink } from "apollo-link";
import { HttpLink } from "apollo-link-http";
import { ApolloProvider } from "@apollo/react-hooks";
import fetch from "isomorphic-unfetch";

let apolloSiteClient = null;

/**
 * Creates and configures the ApolloClient
 * @param  {Object} [initialState={}]
 */
const createApolloClient = (initialState = {}) => {
  // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
  const isBrowser = typeof window !== "undefined";
  const link = ApolloLink.from([
    new RetryLink(),
    new HttpLink({
      uri: process.env.APOLLO_CLIENT_URI, // Server URL (must be absolute)
      credentials: "same-origin", // Additional fetch() options like `credentials` or `headers`
      // Use fetch() polyfill on the server
      fetch: !isBrowser && fetch
    })
  ]);
  return new ApolloClient({
    assumeImmutableResults: true,
    connectToDevTools: isBrowser,
    ssrMode: !isBrowser, // Disables forceFetch on the server (so queries are only run once)
    link,
    cache: new InMemoryCache({ freezeResults: true }).restore(
      initialState || {}
    )
  });
};

/**
 * Always creates a new apollo client on the server
 * Creates or reuses apollo client in the browser.
 *
 * @param initialState
 * @returns {*}
 */
const initApolloClient = (initialState = {}) => {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === "undefined") {
    return createApolloClient(initialState);
  }

  // Reuse client on the client-side
  if (!apolloSiteClient) {
    apolloSiteClient = createApolloClient(initialState);
  }

  return apolloSiteClient;
};

/**
 * Creates and provides the apolloContext
 * to a next.js PageTree. Use it by wrapping
 * your PageComponent via HOC pattern.
 *
 * @param PageComponent
 * @param ssr
 * @returns {function({apolloClient?: *, apolloState?: *, pageProps: *})}
 */
export const withApollo = (PageComponent, { ssr = true } = {}) => {
  const WithApollo = ({ apolloClient, apolloState, ...pageProps }) => {
    const client = useMemo(
      () => apolloClient || initApolloClient(apolloState),
      []
    );
    return (
      <ApolloProvider client={client}>
        <PageComponent {...pageProps} />
      </ApolloProvider>
    );
  };

  // Set the correct displayName in development
  if (process.env.NODE_ENV !== "production") {
    const displayName =
      PageComponent.displayName || PageComponent.name || "Component";

    if (displayName === "App") {
      // console.warn("This withApollo HOC only works with PageComponents.");
    }

    WithApollo.displayName = `withApollo(${displayName})`;
  }

  // Allow Next.js to remove getInitialProps from the browser build
  if (typeof window === "undefined") {
    if (ssr) {
      WithApollo.getInitialProps = async ctx => {
        const { AppTree } = ctx;

        let pageProps = {};
        if (PageComponent.getInitialProps) {
          pageProps = await PageComponent.getInitialProps(ctx);
        }

        // Run all GraphQL queries in the component tree
        // and extract the resulting data
        const apolloClient = initApolloClient();

        try {
          // Run all GraphQL queries
          await getDataFromTree(
            <AppTree
              pageProps={{
                ...pageProps,
                apolloClient
              }}
            />
          );
        } catch (error) {
          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
          // console.error("Error while running `getDataFromTree`", error);
        }

        // getDataFromTree does not call componentWillUnmount
        // head side effect therefore need to be cleared manually
        Head.rewind();

        // Extract query data from the Apollo store
        const apolloState = apolloClient.cache.extract();

        return {
          ...pageProps,
          apolloState
        };
      };
    }
  }

  return WithApollo;
};

export default () => {};
