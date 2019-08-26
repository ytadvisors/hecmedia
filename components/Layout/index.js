import React from "react";
import { ApolloProvider } from "react-apollo";
import ApolloClient from "apollo-boost";
import "./styles.scss";

export default () => {
  const { APOLLO_CLIENT_URI } = process.env;
  const client = new ApolloClient({
    // Change this to the URL of your WordPress site.
    uri: APOLLO_CLIENT_URI
  });

  return (
    <ApolloProvider client={client}>
      <section className="layout" />
    </ApolloProvider>
  );
};
