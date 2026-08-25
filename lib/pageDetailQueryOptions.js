const pageDetailQueryOptions = uri => ({
  variables: { uri },
  // The browser-level Apollo client survives route changes. A cache-first page
  // query can therefore show an older WordPress body until a hard refresh.
  // Always verify dynamic page content with WordPress before rendering it.
  fetchPolicy: "network-only",
  notifyOnNetworkStatusChange: true
});

export default pageDetailQueryOptions;
