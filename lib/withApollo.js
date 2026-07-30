import React from "react";
import { getDataFromTree } from "@apollo/react-ssr";
import initApollo from "./initApollo";

export default App =>
  class Apollo extends React.Component {
    static displayName = "withApollo(App)";

    static async getInitialProps(ctx) {
      const {
        Component,
        AppTree,
        router,
        ctx: { req, res }
      } = ctx;

      let appProps = {};
      const apolloState = {};
      const apollo = !process.browser
        ? initApollo({}, { getToken: () => req.headers.cookie })
        : initApollo();
      ctx.ctx.apollo = apollo;

      if (App.getInitialProps) {
        appProps = await App.getInitialProps(ctx);
      }

      if (res && res.finished) {
        return {};
      }

      // Only on the server:
      if (typeof window === "undefined") {
        // When redirecting, the response is finished.
        // No point in continuing to render
        if (ctx.res && ctx.res.finished) {
          return appProps;
        }

        // Run all GraphQL queries in the component tree
        // and extract the resulting data
        try {
          // Run all GraphQL queries
          await getDataFromTree(
            <AppTree
              {...appProps}
              Component={Component}
              router={router}
              apolloState={apolloState}
              apolloClient={apollo}
            />
          );
        } catch (error) {
          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // http://dev.apollodata.com/react/api-queries.html#graphql-query-data-error
          console.error("Error while running `getDataFromTree`", error);
        }
      }

      // Extract query data from the Apollo store
      apolloState.data = apollo.cache.extract();

      return {
        ...appProps,
        apolloState
      };
    }

    constructor(props) {
      super(props);
      // `getDataFromTree` renders the component first, the client is passed off as a property.
      // After that rendering is done using Next's normal rendering pipeline
      this.apolloClient =
        props.apolloClient || initApollo(props.apolloState.data, {});
    }

    render() {
      return <App {...this.props} apolloClient={this.apolloClient} />;
    }
  };
