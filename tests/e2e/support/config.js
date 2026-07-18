/**
 * Endpoint config for the API e2e suite. Real defaults point at the live
 * production WPGraphQL/REST backend (read-only calls only, see writeGuard.js),
 * confirmed reachable in Phase 0/Phase 2 discovery:
 *   - GraphQL:  https://prod-wp.hectv.org/graphql
 *   - REST:     https://prod-wp.hectv.org/wp-json/wp/v2/*
 * Override via APOLLO_CLIENT_URI / GATSBY_WP_HOST env vars (same vars the app
 * itself reads — see lib/initApollo.js and store/api/index.js) to point at a
 * different WP instance (e.g. the local staging harness in
 * deliverables/hecmedia/staging-wp-harness, APOLLO_CLIENT_URI=http://localhost:8090/graphql).
 */
const DEFAULT_GRAPHQL_URI = "https://prod-wp.hectv.org/graphql";
const DEFAULT_REST_HOST = "https://prod-wp.hectv.org";

const GRAPHQL_URI = process.env.APOLLO_CLIENT_URI || DEFAULT_GRAPHQL_URI;
const REST_HOST = (process.env.GATSBY_WP_HOST || DEFAULT_REST_HOST).replace(
  /\/+$/,
  ""
);

module.exports = {
  GRAPHQL_URI,
  REST_HOST
};
