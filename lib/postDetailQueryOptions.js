const postDetailQueryOptions = slug => ({
  variables: { slug },
  // The browser-level Apollo client survives route changes. A cache-first post
  // query can therefore show content from hours earlier until a hard refresh.
  // Always verify post bodies with WordPress before rendering a detail route.
  fetchPolicy: "network-only",
  notifyOnNetworkStatusChange: true
});

export default postDetailQueryOptions;
