process.env.DEPLOY_SHA = "a".repeat(40);

const {
  assertLiveGtmMarkup,
  assertOnlyApprovedGtmIds,
  assertPage,
  assertRenderedSiteIdentity
} = require("./verify-production");

const exactGtmMarkup = [
  "<script>",
  "window.dataLayer=window.dataLayer||[];",
  "window.dataLayer.push({event:'gtm.js'});",
  "'https://www.googletagmanager.com/gtm.js?id='+i;",
  "})(window,document,'script','dataLayer','GTM-57RZPNN');",
  "</script>"
].join("");

function productionPage(title, content = "") {
  return [
    "<html><head>",
    `<title>${title}</title>`,
    '<meta name="hecmedia-deploy-sha" content="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">',
    '<meta name="hecmedia-forms-mode" content="false">',
    exactGtmMarkup,
    `</head><body>${content}</body></html>`
  ].join("");
}

test("plain verifier accepts the route-appropriate HEC on YouTube identity", () => {
  const body = productionPage("HEC on YouTube");
  expect(body).not.toContain("HEC-TV");
  expect(() =>
    assertPage({
      body,
      route: "/posts/hec-on-youtube",
      statusCode: 200
    })
  ).not.toThrow();
});

test("route identity remains fail-closed for ordinary HEC-TV routes", () => {
  expect(() =>
    assertRenderedSiteIdentity("<title>HEC on YouTube</title>", "/events")
  ).toThrow("did not render the HEC-TV identity");
  expect(() =>
    assertRenderedSiteIdentity(
      "<title>HEC-TV | Events</title><h1>404 not found.</h1>",
      "/events"
    )
  ).toThrow("rendered a 404 page");
});

test("live verifier accepts only one exact GTM bootstrap", () => {
  expect(() => assertLiveGtmMarkup(exactGtmMarkup, "/")).not.toThrow();
  expect(() => assertLiveGtmMarkup("<title>HEC-TV</title>", "/")).toThrow(
    "missing or unapproved GTM container"
  );
  expect(() =>
    assertLiveGtmMarkup(
      exactGtmMarkup.replace(/GTM-57RZPNN/g, "GTM-WRONG"),
      "/"
    )
  ).toThrow("missing or unapproved GTM container");
  expect(() =>
    assertLiveGtmMarkup(
      exactGtmMarkup.replace("GTM-57RZPNN", "GTM-undefined"),
      "/"
    )
  ).toThrow();
  expect(() =>
    assertLiveGtmMarkup(`${exactGtmMarkup}${exactGtmMarkup}`, "/")
  ).toThrow("must render exactly one approved GTM-57RZPNN");
  expect(() =>
    assertOnlyApprovedGtmIds(
      `${exactGtmMarkup}<script src="https://www.googletagmanager.com/gtm.js?id=GTM-57RZPNN"></script>`,
      "/"
    )
  ).not.toThrow();
});
