/**
 * Parameterized Routing with next-route
 *
 * Benefits: Less code, and easily handles complex url structures
 * */
const routes = require("next-routes");

// Name   Page      Pattern
module.exports = routes()
  .add("category/[proxy]", "/category/:proxy+")
  .add("event/[slug]", "/event/:slug")
  .add("event_filter/[category]/[day]", "/event_filter/:category/:day")
  .add("magazine/[slug]", "/magazine/:slug")
  .add("posts/[slug]", "/posts/:slug")
  .add("events", "/events")
  .add("magazines", "/magazines")
  .add("pages", "/pages")
  .add("articles", "/articles")
  .add("search/[query]", "/search/:query+");
