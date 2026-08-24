const CANONICAL_ARTS_PROGRAM_ROUTE = "/category/arts/two-on-the-aisle";

const PRODUCTION_ROUTES = Object.freeze([
  "/",
  "/events",
  "/about-us",
  "/newsletter",
  "/newsletter/thank-you",
  "/category/films",
  CANONICAL_ARTS_PROGRAM_ROUTE,
  "/posts/hec-on-youtube"
]);

const HYDRATED_MEDIA_REQUIREMENTS = Object.freeze({
  "/": Object.freeze({ minimum: 1, surface: "post-list" }),
  "/category/films": Object.freeze({ minimum: 1, surface: "post-list" }),
  [CANONICAL_ARTS_PROGRAM_ROUTE]: Object.freeze({
    minimum: 1,
    surface: "post-list"
  }),
  "/posts/hec-on-youtube": Object.freeze({
    minimum: 1,
    surface: "article-content"
  }),
  "/newsletter": Object.freeze({ minimum: 0 })
});

module.exports = {
  CANONICAL_ARTS_PROGRAM_ROUTE,
  HYDRATED_MEDIA_REQUIREMENTS,
  PRODUCTION_ROUTES
};
