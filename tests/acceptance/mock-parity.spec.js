/**
 * Client mock-parity acceptance suite (see MOCK-GAP-SPEC.md).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * On master 104363a the unit suite is 233/233 green while six of the seven
 * client requirements (a-g) are undelivered on the deployed site. Every one of
 * those six has passing unit tests. Unit tests assert that a component renders
 * when you render it — they cannot see that the home page never renders that
 * component (req b), that the thing being replaced is still on the page
 * (req c), or that a Jest-green route 404s behind Lambda@Edge (req d).
 *
 * So these assertions drive a real browser against the DEPLOYED site and scan
 * the hydrated DOM. A requirement is delivered when it is visible to the
 * client, not when it is covered.
 *
 * EXPECTED STATE AS WRITTEN (master 104363a): req (a) passes, (b)-(g) FAIL.
 * The failures are the gap. Each goes green as its remediation task lands
 * (T1-T6 = tasks #82689-82694). Do not skip, soften or delete an assertion to
 * get a green run; if one is wrong on the merits, fix it in a PR that says why.
 *
 *   yarn test:acceptance
 *   STAGING_SITE_URL=https://development.hecmedia.org yarn test:acceptance
 */
/* eslint-env node */
// Playwright is provisioned by the worker acceptance gate, not this legacy app's lockfile.
// eslint-disable-next-line import/no-unresolved
const { test, expect } = require("@playwright/test");

const MOCK_NAV = [
  "ABOUT",
  "PROGRAMS",
  "PRODUCTION SERVICES",
  "WATCH NOW",
  "READ NOW"
];
const MOCK_CTAS = ["SUBSCRIBE", "SUPPORT", "GET INVOLVED"];
// Google's documented v2 test key. Its presence is an intentional staging
// safety contract: the acceptance run must never solve a production captcha.
const RECAPTCHA_V2_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const HEADER_IMAGE_FIXTURES = [
  { slug: "header-image-size-small", size: "small" },
  { slug: "header-image-size-medium", size: "medium" },
  { slug: "header-image-size-large", size: "large" },
  { slug: "header-image-size-full", size: "full" },
  // No meta value: this is the backwards-compatibility fixture, not a fifth size.
  { slug: "header-image-size-default", size: "full", defaultValue: true }
];

/**
 * HEALTH GATE — run before every requirement assertion.
 *
 * A suite that can pass because the page failed to render is worse than no suite.
 * Against the local stack on 2026-07-22 this happened for real: WPGraphQL there is
 * core-schema-only, the app's queries threw ("Cannot query field \"scheduleBy\""), the
 * home page came up behind a Next dev error overlay — and two assertions PASSED anyway,
 * because the content they check for absence of ("(b) old Spotlight logo is gone",
 * "(c) newsletter is not in the rail") simply never rendered.
 *
 * So: if the page did not actually render, fail loudly here instead of reporting a
 * green requirement. Absence-based assertions are only meaningful on a healthy page.
 */
async function assertPageRendered(page) {
  const overlay = await page
    .locator("nextjs-portal, [data-nextjs-dialog], #__next-error")
    .count();
  expect(overlay, "page rendered behind a Next.js error overlay").toBe(0);

  // Always present on every page of this site, in every environment.
  await expect(
    page.locator("header.header"),
    "site header did not render — the page is not healthy"
  ).toHaveCount(1);
}

/** goto + health gate. Use this instead of a bare page.goto in every test. */
async function open(page, path) {
  const response = await page.goto(path);
  await assertPageRendered(page);
  return response;
}

test.describe("(a) sticky header", () => {
  test("header is sticky and keeps its layout space", async ({ page }) => {
    await open(page, "/");
    const header = page.locator("header.header");
    await expect(header).toHaveClass(/header--sticky/);
    await expect(header).toHaveCSS("position", "sticky");
  });
});

test.describe("(b) rail promo replaces the Spotlight logo", () => {
  test("the old Spotlight logo is gone from the right rail", async ({
    page
  }) => {
    await open(page, "/");
    // WHY THIS SELECTOR IS EXACT, NOT A SUBSTRING MATCH.
    //
    // It previously read
    //   '.col-lg-3 img[alt*="spotlight" i], .col-lg-3 img[src*="spotlight" i]'
    // which is wrong on the merits. The mock RETAINS a separate "HEC-TV
    // SPOTLIGHT" list below Trending Now (see §(b) notes and T2), and that
    // list's legitimate post thumbnails can carry "spotlight" in their alt text
    // or in their CDN src. The broad matcher would therefore fail (b) precisely
    // when T2 had been implemented correctly — it made the gate incompatible
    // with its own remediation target.
    //
    // The single element (b) retires is the ProgramViewer rail image, identified
    // by its link destination and its static asset rather than generic Spotlight text.
    const stale = page.locator(
      '.col-lg-3 a[href="/posts/as-seen-on-spotlight"] img[src*="/static/assets/spotlight-img.jpg"]'
    );
    await expect(stale).toHaveCount(0);
  });

  test("a promo card renders with both an image and a link", async ({
    page
  }) => {
    await open(page, "/");
    const promo = page.locator(
      ".col-lg-3 a.rail-promo, .col-lg-3 a.educators-card"
    );
    await expect(promo).toHaveCount(1);
    await expect(promo).toHaveAttribute("href", /.+/);
    await expect(promo.locator("img")).toHaveCount(1);
  });
});

test.describe("(c) Trending Now replaces the rail newsletter", () => {
  test("the newsletter signup is no longer in the right rail", async ({
    page
  }) => {
    await open(page, "/");
    // "Replace" means the old one is gone. It lives on /newsletter now (req d).
    await expect(page.locator(".col-lg-3 form")).toHaveCount(0);
  });

  test("Trending Now renders thumbnails, per the mock", async ({ page }) => {
    await open(page, "/");
    const trending = page.locator("[class*=trending]").first();
    await expect(trending).toBeVisible();
    expect(await trending.locator("li").count()).toBeGreaterThan(0);
    expect(await trending.locator("img").count()).toBeGreaterThan(0);
  });

  test("Trending Now sits above the retained HEC-TV Spotlight list", async ({
    page
  }) => {
    await open(page, "/");
    const order = await page.evaluate(() => {
      const all = [...document.querySelectorAll("*")];
      const trending = document.querySelector("[class*=trending]");
      const spotlight = all.find(
        el =>
          el.children.length === 0 &&
          /HEC-TV SPOTLIGHT/i.test(el.textContent || "")
      );
      if (!trending || !spotlight)
        return { trending: !!trending, spotlight: !!spotlight };
      return {
        trending: true,
        spotlight: true,
        trendingFirst: all.indexOf(trending) < all.indexOf(spotlight)
      };
    });
    expect(order).toEqual({
      trending: true,
      spotlight: true,
      trendingFirst: true
    });
  });
});

test.describe("(d) newsletter page redirects to a Thank You page", () => {
  test("/newsletter serves", async ({ page }) => {
    const res = await page.goto("/newsletter");
    expect(res.status()).toBe(200);
  });

  // The regression that shipped: Jest-green, Lambda@Edge-404. route-list.json's
  // catch-all is single-segment, so nothing matches /newsletter/thank-you.
  test("/newsletter/thank-you serves — the redirect target must exist", async ({
    page
  }) => {
    const res = await page.goto("/newsletter/thank-you");
    expect(res.status()).toBe(200);
  });

  // The requirement is a REDIRECT, and a redirect is only proven by performing
  // the navigation that is supposed to cause it. Visiting /newsletter and
  // /newsletter/thank-you independently still passes when the form posts
  // nowhere, posts to the wrong route, or never redirects — which is exactly
  // the class of bug that shipped here. So this test submits the real form and
  // asserts where the browser ends up.
  test("submitting the newsletter form lands the browser on Thank You", async ({
    page
  }) => {
    // ------------------------------------------------------------------
    // SAFETY: THIS RUNS AGAINST A LIVE CLIENT SITE. NO REAL SIGNUP MAY OCCUR.
    //
    // The subscribe endpoint is FULFILLED IN THE BROWSER, never continued.
    //      pages/newsletter/index.js posts to the same-origin Next API route
    //      /api/newsletter/subscribe, and that route is the only thing that
    //      would ever reach an ESP. route.fulfill() answers it locally, so the
    //      POST never leaves Playwright: the staging server never sees it, no
    //      subscriber row is written, and no ESP automation can fire. We
    //      deliberately do NOT call route.continue()/route.fallback() here.
    // ------------------------------------------------------------------
    const subscribeRequests = [];
    await page.route("**/api/newsletter/subscribe", async route => {
      subscribeRequests.push({ method: route.request().method() });
      // Stubbed success. The request stops here and is never forwarded.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: "stubbed-acceptance-run" })
      });
    });

    await open(page, "/newsletter");

    const form = page.locator("form.newsletter-signup-form");
    await expect(
      form,
      "the newsletter signup form must render on /newsletter"
    ).toBeVisible();

    await page.locator("#newsletter-first-name").fill("Acceptance");
    await page.locator("#newsletter-last-name").fill("Test");
    // .invalid is reserved by RFC 2606 and can never be a real mailbox.
    await page
      .locator("#newsletter-email")
      .fill("acceptance-test@example.invalid");
    await page.locator("#newsletter-consent").check();

    // The form refuses to submit without a captcha token, so the widget stays
    // in the flow. Assert the documented Google test key before interacting:
    // staging must never present a production captcha key to this live-browser
    // check. A production key fails loudly rather than being worked around.
    const captchaFrame = page.locator(
      `iframe[src*="${RECAPTCHA_V2_TEST_SITE_KEY}"]`
    );
    await expect(captchaFrame).toHaveCount(1);
    await page
      .frameLocator(`iframe[src*="${RECAPTCHA_V2_TEST_SITE_KEY}"]`)
      .getByRole("checkbox")
      .check();

    await form.getByRole("button", { name: /subscribe/i }).click();

    // The form actually posted, and posted to the route it is meant to.
    await expect
      .poll(() => subscribeRequests.length, {
        message: "the form never posted to /api/newsletter/subscribe"
      })
      .toBe(1);
    expect(subscribeRequests[0].method).toBe("POST");

    // ...and that submission is what moved the browser to the Thank You route.
    await expect(page).toHaveURL(/\/newsletter\/thank-you\/?$/);
    await expect(
      page.getByRole("heading", { name: /thank you/i })
    ).toBeVisible();
  });
});

test.describe("(e) navigation sub-dropdowns", () => {
  test("a nested submenu exists and opens", async ({ page }) => {
    await open(page, "/");
    const parent = page.locator("#main-nav .dropdown-menu li").filter({
      has: page.locator(".dropdown-menu, ul")
    });
    expect(await parent.count()).toBeGreaterThan(0);
    await parent.first().hover();
    await expect(
      parent
        .first()
        .locator(".dropdown-menu, ul")
        .first()
    ).toBeVisible();
  });

  test("top-level labels come from the CMS menu, matching the mock", async ({
    page
  }) => {
    await open(page, "/");
    const labels = await page.$$eval("#main-nav .nav > li", items =>
      items.map(li =>
        (li.textContent || "")
          .trim()
          .split("\n")[0]
          .toUpperCase()
      )
    );
    MOCK_NAV.forEach(expected => expect(labels).toContain(expected));
  });
});

test.describe("(f) article header image sizing", () => {
  /**
   * WHY THIS IS A MEASUREMENT, NOT A MARKER CHECK.
   *
   * This assertion used to be
   *   expect('[data-header-image-size], [class*=header-image--]').toHaveCount(1)
   * which is satisfied by a hardcoded attribute with no CSS behind it — i.e. by
   * exactly the "shipped a marker, shipped no feature" failure mode this whole
   * suite exists to catch. `hectv_header_image_size` is a post-meta enum
   * (small|medium|large|full, default full) and the requirement is that the
   * four values RENDER DIFFERENTLY and that the default preserves today's
   * rendering. So we measure the laid-out box of the header image on one post
   * per value and assert the widths are strictly ordered and distinct.
   *
   * ON STAGING TODAY THIS FAILS AT THE FIRST FIXTURE — /posts/header-image-size-*
   * do not exist there, because (f) is unimplemented and the meta is not
   * registered. That is the intended state (see the file header): the fixtures
   * are created by dev-infra/wordpress/seed.sh and become reachable when T6
   * lands. Do NOT weaken this back toward an existence/marker check to get a
   * green run — a loudly failing (f) is the accurate report.
   */
  test("all four configured sizes visibly differ and the default preserves full", async ({
    page
  }, testInfo) => {
    // The width contract is evaluated at desktop size; responsive CSS may
    // deliberately collapse these widths on a narrow viewport.
    test.skip(
      testInfo.project.name !== "desktop",
      "desktop visual sizing contract"
    );

    const measurements = {};
    // Sequential by necessity: every fixture navigates the same shared `page`.
    // A reduce-chain (not a for-loop) keeps that serial order lint-clean.
    await HEADER_IMAGE_FIXTURES.reduce(async (previous, fixture) => {
      await previous;
      await open(page, `/posts/${fixture.slug}`);
      const image = page.locator(".article-header-image");
      await expect(
        image,
        `no header image on /posts/${fixture.slug} — (f) is not implemented`
      ).toHaveCount(1);
      // The meta-free fixture must resolve to the documented default, `full`.
      await expect(image).toHaveAttribute(
        "data-header-image-size",
        fixture.size
      );
      measurements[fixture.slug] = await image.evaluate(element => {
        const { width } = element.getBoundingClientRect();
        return width;
      });
      expect(measurements[fixture.slug]).toBeGreaterThan(0);
    }, Promise.resolve());

    // A constant marker produces four identical widths and fails right here.
    expect(measurements["header-image-size-small"]).toBeLessThan(
      measurements["header-image-size-medium"]
    );
    expect(measurements["header-image-size-medium"]).toBeLessThan(
      measurements["header-image-size-large"]
    );
    expect(measurements["header-image-size-large"]).toBeLessThan(
      measurements["header-image-size-full"]
    );
    expect(measurements["header-image-size-default"]).toBe(
      measurements["header-image-size-full"]
    );
  });
});

test.describe("(g) customizable top-bar buttons", () => {
  test("CTAs match the mock", async ({ page }) => {
    await open(page, "/");
    const labels = await page.$$eval(".top-bar-actions a, .top-bar-cta", els =>
      els.map(el => (el.textContent || "").trim().toUpperCase())
    );
    MOCK_CTAS.forEach(expected => {
      expect(labels.some(l => l.includes(expected))).toBe(true);
    });
  });

  test("no dead CTAs — every one is a real link with an href", async ({
    page
  }) => {
    await open(page, "/");
    await expect(page.locator(".top-bar-actions button")).toHaveCount(0);
    await expect(page.locator(".top-bar-actions a:not([href])")).toHaveCount(0);
  });
});

test.describe("no staging scaffolding is visible to the client", () => {
  test("no STAGING PREVIEW / STAGING ONLY badges anywhere on the home page", async ({
    page
  }) => {
    await open(page, "/");
    const body = (await page.locator("body").innerText()).toUpperCase();
    expect(body).not.toContain("STAGING PREVIEW");
    expect(body).not.toContain("STAGING ONLY");
  });
});
