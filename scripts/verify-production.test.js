const {
  assertGtmMarkup,
  assertNewsletterApiAbsent,
  assertPage,
  buildApiVerificationChecks,
  buildPageVerificationChecks,
  requireVerificationContract
} = require("./verify-production");

const releaseSha = "a".repeat(40);

function gtmMarkup(id = "GTM-57RZPNN") {
  return [
    "<script>",
    "window.dataLayer=window.dataLayer||[];",
    "window.dataLayer.push({'gtm.start':1,event:'gtm.js'});",
    "j.src='https://www.googletagmanager.com/gtm.js?id='+i;",
    `})(window,document,'script','dataLayer','${id}');`,
    "</script>"
  ].join("");
}

function page(route, title, content = "") {
  return {
    route,
    statusCode: 200,
    body: [
      `<title>${title}</title>`,
      `<meta name="hecmedia-deploy-sha" content="${releaseSha}"/>`,
      '<meta name="hecmedia-forms-mode" content="false"/>',
      '<meta name="hecmedia-newsletter-mode" content="omit"/>',
      content,
      gtmMarkup()
    ].join("")
  };
}

const contract = {
  expectedFormsMode: "false",
  expectedGtmId: "GTM-57RZPNN",
  expectedNewsletterMode: "omit",
  expectedSha: releaseSha
};

test("accepts route-specific identity without universal HEC-TV copy", () => {
  expect(() =>
    assertPage(
      page(
        "/posts/hec-on-youtube",
        "HEC on YouTube",
        '<article data-media-verification="article-content">Video</article>'
      ),
      contract
    )
  ).not.toThrow();
  expect(() =>
    assertPage(page("/", "HEC-TV | Home", "HEC-TV Trending Now"), contract)
  ).not.toThrow();
});

test("pins a distinct identity contract for every governed route", () => {
  const cases = [
    ["/events", "HEC-TV | Events", "<main><h1>Events</h1></main>"],
    ["/about-us", "HEC-TV | About Us", "<main>About</main>"],
    [
      "/newsletter",
      "HEC-TV | Newsletter Signup",
      '<main class="newsletter-unavailable">Unavailable</main>'
    ],
    [
      "/newsletter/thank-you",
      "HEC-TV | Newsletter Signup Complete",
      "<main>Thank you for subscribing</main>"
    ],
    [
      "/category/films",
      "HEC-TV | Films",
      '<main data-media-verification="post-list">Films</main>'
    ],
    [
      "/category/arts/two_on_the_aisle",
      "HEC-TV | Two_on_the_aisle",
      '<main data-media-verification="post-list">Arts</main>'
    ]
  ];
  cases.forEach(([route, title, content]) =>
    expect(() =>
      assertPage(page(route, title, content), contract)
    ).not.toThrow()
  );
  expect(() =>
    assertPage(
      page("/events", "HEC-TV | About Us", "<h1>Events</h1>"),
      contract
    )
  ).toThrow("unexpected route identity");
});

test("rejects a YouTube article that is really an error document", () => {
  expect(() =>
    assertPage(
      page(
        "/posts/hec-on-youtube",
        "404",
        '<article data-media-verification="article-content">404 not found.</article>'
      ),
      contract
    )
  ).toThrow("404/error document");
});

test("requires exactly the approved GTM id, loader, and bootstrap", () => {
  expect(() => assertGtmMarkup(gtmMarkup(), "/")).not.toThrow();
  expect(() => assertGtmMarkup(`${gtmMarkup()} GTM-WRONG`, "/")).toThrow(
    "only the approved GTM container"
  );
  expect(() =>
    assertGtmMarkup(`${gtmMarkup()} www.googletagmanager.com/gtm.js?id=`, "/")
  ).toThrow("exactly one GTM loader");
  expect(() =>
    assertGtmMarkup(gtmMarkup().replace(/dataLayer/g, "undefined"), "/")
  ).toThrow("invalid GTM dataLayer bootstrap");
});

test("pins send-enabled general forms, newsletter omission, and exact GTM", () => {
  const env = {
    DEPLOY_SHA: releaseSha,
    GA_TAGMANAGER_ID: "GTM-57RZPNN",
    HECMEDIA_EDGE_API: "false",
    HECMEDIA_NEWSLETTER_MODE: "omit",
    HECMEDIA_NO_SEND_FORMS: "false"
  };
  expect(requireVerificationContract(env)).toMatchObject(contract);
  expect(() =>
    requireVerificationContract({ ...env, HECMEDIA_EDGE_API: "true" })
  ).toThrow("HECMEDIA_EDGE_API must equal false");
  expect(() =>
    requireVerificationContract({ ...env, HECMEDIA_NO_SEND_FORMS: "true" })
  ).toThrow("HECMEDIA_NO_SEND_FORMS must equal false");
  expect(() =>
    requireVerificationContract({ ...env, HECMEDIA_NEWSLETTER_MODE: "active" })
  ).toThrow("HECMEDIA_NEWSLETTER_MODE must equal omit");
});

test("requires the newsletter API route to remain absent", () => {
  expect(() => assertNewsletterApiAbsent({ statusCode: 404 })).not.toThrow();
  expect(() => assertNewsletterApiAbsent({ statusCode: 405 })).toThrow(
    "expected 404 with the API omitted"
  );
});

test("checks both aliases with normal and repeated fresh responses", () => {
  const pages = buildPageVerificationChecks(
    ["hecmedia.org", "www.hecmedia.org"],
    ["/", "/events"]
  );
  expect(pages).toHaveLength(12);
  expect(new Set(pages.map(check => check.mode))).toEqual(
    new Set(["normal", "fresh-1", "fresh-2"])
  );
  expect(buildApiVerificationChecks(["hecmedia.org"])).toEqual([
    { alias: "hecmedia.org", mode: "normal" },
    { alias: "hecmedia.org", mode: "fresh" }
  ]);
});
