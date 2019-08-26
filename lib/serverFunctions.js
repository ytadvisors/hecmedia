// A nice helper to tell us if we're on the server
export const isServer = !(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);
export const getNumAPIResults = response => {
  let numResults = 0;
  if (response.headers && response.headers["x-wp-total"])
    numResults = response.headers["x-wp-total"] / 1;
  return numResults;
};
