import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloLink } from "apollo-link";
import { RetryLink } from "apollo-link-retry";
import { createHttpLink } from "apollo-link-http";
import Cookies from "js-cookie";
import { setContext } from "apollo-link-context";
import fetch from "isomorphic-unfetch";

let apolloClient = null;

// Polyfill fetch() on the server (used by apollo-client)
if (typeof window === "undefined") {
  global.fetch = fetch;
}

function create(initialState, { fetchOptions }) {
  const isBrowser = typeof window !== "undefined";

  const httpLink = createHttpLink({
    uri: process.env.APOLLO_CLIENT_URI, // Server URL (must be absolute)
    credentials: "same-origin", // Additional fetch() options like `credentials` or `headers`
    // Use fetch() polyfill on the server
    fetch: !isBrowser && fetch,
    fetchOptions
  });

  const authLink = setContext((_, { headers }) => {
    if (isBrowser) {
      const token = Cookies.get("token");
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : ""
        }
      };
    }
    return {
      headers: { ...headers }
    };
  });

  const link = ApolloLink.from([new RetryLink(), authLink.concat(httpLink)]);

  return new ApolloClient({
    connectToDevTools: isBrowser,
    ssrMode: !isBrowser, // Disables forceFetch on the server (so queries are only run once)
    link,
    cache: new InMemoryCache().restore(initialState || {})
  });
}

export default function initApollo(initialState = {}, options = {}) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === "undefined") {
    let fetchOptions = {};
    // If you are using a https_proxy, add fetchOptions with 'https-proxy-agent' agent instance
    // 'https-proxy-agent' is required here because it's a sever-side only module
    if (process.env.https_proxy) {
      fetchOptions = {
        agent: new (require("https-proxy-agent"))(process.env.https_proxy)
      };
    }
    return create(initialState, {
      ...options,
      fetchOptions
    });
  }
  // Reuse client on the client-side
  if (!apolloClient) {
    apolloClient = create(initialState, options);
  }
  return apolloClient;
}
