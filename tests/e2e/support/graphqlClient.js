const fetch = require("isomorphic-unfetch");
const { print } = require("graphql");
const { GRAPHQL_URI } = require("./config");

/**
 * Executes a query document (the same gql`` AST exported by lib/graphql.js)
 * against the live WPGraphQL endpoint and returns the parsed JSON body.
 * Network/HTTP failures throw with the endpoint + status in the message so a
 * broken connection reads clearly in CI output instead of a bare fetch error.
 */
async function executeQuery(document, variables) {
  const res = await fetch(GRAPHQL_URI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: print(document), variables })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GraphQL request to ${GRAPHQL_URI} failed: HTTP ${
        res.status
      } — ${body.slice(0, 500)}`
    );
  }

  return res.json();
}

module.exports = { executeQuery };
