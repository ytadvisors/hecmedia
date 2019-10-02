/**
 * Parameterized Routing with next-route
 *
 * Benefits: Less code, and easily handles complex url structures
 * */
const routes = require("next-routes");
const _ = require("lodash");
const routeList = require("./route-list.json");

const routesMap = routes();
_.keys(routeList).map(key => {
  const values = routeList[key];
  return values.map(newRoute => {
    if (newRoute.page && newRoute.pattern)
      routesMap.add(newRoute.page, key, newRoute.pattern);
    return false;
  });
});
module.exports = routesMap;
