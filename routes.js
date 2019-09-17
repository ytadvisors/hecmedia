/**
 * Parameterized Routing with next-route
 *
 * Benefits: Less code, and easily handles complex url structures
 * */
const routes = require("next-routes");
const _ = require("lodash");
const routeList = require("./route-list.json");

const routesMap = routes();
_.values(routeList).map(newRoute => {
  if (newRoute.page && newRoute.pattern)
    routesMap.add(newRoute.page, newRoute.pattern);
  return false;
});
module.exports = routesMap;
