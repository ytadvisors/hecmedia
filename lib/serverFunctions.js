// A nice helper to tell us if we're on the server
export const isServer = !(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);

export const preloadGraphqlQuery = async (apolloClient, options) => {
  if (isServer) {
    try {
      await apolloClient.query(options);
    } catch (e) {
      // noop
    }
  }
};

export default () => {};
