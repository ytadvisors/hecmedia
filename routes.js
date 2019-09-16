/**
 * Parameterized Routing with next-route
 *
 * Benefits: Less code, and easily handles complex url structures
 * */
const routes = require("next-routes");

// Name   Page      Pattern
module.exports = routes()
  .add("articles")
  .add("category", "/category/:proxy+")
  .add("event_filter", "/event_filter/:proxy+")
  .add("event", "/event/:slug")
  .add("events", "/events")
  .add("magazine", "/magazine/:slug")
  .add("magazines")
  .add("pages")
  .add("posts", "/posts/:slug")
  .add("search", "/search/:query");
