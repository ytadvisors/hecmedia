/**
 * Parameterized Routing with next-route
 *
 * Benefits: Less code, and easily handles complex url structures
 * */
const routes = require("next-routes");
const _ = require("lodash");
const routeList = require("./route-list.json");

const routesMap = routes();
_.values(routeList).map(newRoute =>
  routesMap.add(newRoute.page, newRoute.pattern)
);
module.exports = routesMap;
