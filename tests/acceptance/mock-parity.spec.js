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
const { test, expect } = require("@playwright/test");

const MOCK_NAV = ["ABOUT", "PROGRAMS", "PRODUCTION SERVICES", "WATCH NOW", "READ NOW"];
const MOCK_CTAS = ["SUBSCRIBE", "SUPPORT", "GET INVOLVED"];
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
  test("the old Spotlight logo is gone from the right rail", async ({ page }) => {
    await open(page, "/");
    // This is the one retired logo from the old ProgramViewer rail. Do not
    // match every image mentioning "spotlight": the retained HEC-TV Spotlight
    // list is explicitly required by (c) and may legitimately contain those.
    const stale = page.locator(
      '.side-navigation a[href="/posts/as-seen-on-spotlight"] > img[src="/static/assets/spotlight-img.jpg"]'
    );
    await expect(stale).toHaveCount(0);
  });

  test("a promo card renders with both an image and a link", async ({ page }) => {
    await open(page, "/");
    const promo = page.locator(".col-lg-3 a.rail-promo, .col-lg-3 a.educators-card");
    await expect(promo).toHaveCount(1);
    await expect(promo).toHaveAttribute("href", /.+/);
    await expect(promo.locator("img")).toHaveCount(1);
  });
});

test.describe("(c) Trending Now replaces the rail newsletter", () => {
  test("the newsletter signup is no longer in the right rail", async ({ page }) => {
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

  test("Trending Now sits above the retained HEC-TV Spotlight list", async ({ page }) => {
    await open(page, "/");
    const order = await page.evaluate(() => {
      const trending = document.querySelector("[class*=trending]");
      const spotlight = [...document.querySelectorAll("*")].find(
        el => el.children.length === 0 && /HEC-TV SPOTLIGHT/i.test(el.textContent || "")
      );
      if (!trending || !spotlight) return { trending: !!trending, spotlight: !!spotlight };
      return {
        trending: true,
        spotlight: true,
        trendingFirst: !!(
          trending.compareDocumentPosition(spotlight) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
      };
    });
    expect(order).toEqual({ trending: true, spotlight: true, trendingFirst: true });
  });
});

test.describe("(d) newsletter page redirects to a Thank You page", () => {
  test("/newsletter serves", async ({ page }) => {
    const res = await page.goto("/newsletter");
    expect(res.status()).toBe(200);
  });

  // The regression that shipped: Jest-green, Lambda@Edge-404. route-list.json's
  // catch-all is single-segment, so nothing matches /newsletter/thank-you.
  test("/newsletter/thank-you serves — the redirect target must exist", async ({ page }) => {
    const res = await open(page, "/newsletter/thank-you");
    expect(res.status()).toBe(200);
  });

  test("a successful newsletter submission reaches the Thank You page", async ({ page }) => {
    // Do not send a real subscription from staging. The browser still exercises
    // the page's form handler and client-side redirect; only its API response is
    // safely intercepted.
    let subscribeCalls = 0;
    await page.route("**/api/newsletter/subscribe", async route => {
      subscribeCalls += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });

    await open(page, "/newsletter");
    const form = page.locator("form.newsletter-signup-form");
    await expect(form).toBeVisible();
    await page.locator("#newsletter-first-name").fill("Acceptance");
    await page.locator("#newsletter-last-name").fill("Test");
    await page.locator("#newsletter-email").fill("acceptance-test@example.invalid");
    await page.locator("#newsletter-consent").check();

    // Staging must use a non-production reCAPTCHA test key. The widget remains
    // part of the browser flow, while the subscription API stays intercepted.
    const captcha = page.frameLocator('iframe[title*="reCAPTCHA"]');
    await captcha.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Subscribe" }).click();

    await expect.poll(() => subscribeCalls).toBe(1);
    await expect(page).toHaveURL(/\/newsletter\/thank-you\/?$/);
    await expect(page.getByRole("heading", { name: "Thank You" })).toBeVisible();
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
    await expect(parent.first().locator(".dropdown-menu, ul").first()).toBeVisible();
  });

  test("top-level labels come from the CMS menu, matching the mock", async ({ page }) => {
    await open(page, "/");
    const labels = await page.$$eval("#main-nav .nav > li", items =>
      items.map(li => (li.textContent || "").trim().split("\n")[0].toUpperCase())
    );
    for (const expected of MOCK_NAV) expect(labels).toContain(expected);
  });
});

test.describe("(f) article header image sizing", () => {
  test("all four configured sizes visibly differ and the default preserves full", async (
    { page },
    testInfo
  ) => {
    // The width contract is evaluated at desktop size; responsive CSS may
    // deliberately collapse these widths on a narrow viewport.
    test.skip(testInfo.project.name !== "desktop", "desktop visual sizing contract");

    const measurements = {};
    for (const fixture of HEADER_IMAGE_FIXTURES) {
      await open(page, `/posts/${fixture.slug}`);
      const image = page.locator('[data-testid="article-header-image"]');
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute("data-header-image-size", fixture.size);
      measurements[fixture.slug] = await image.evaluate(element => {
        const { width } = element.getBoundingClientRect();
        return width;
      });
      expect(measurements[fixture.slug]).toBeGreaterThan(0);
    }

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
    for (const expected of MOCK_CTAS) {
      expect(labels.some(l => l.includes(expected))).toBe(true);
    }
  });

  test("no dead CTAs — every one is a real link with an href", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator(".top-bar-actions button")).toHaveCount(0);
    await expect(page.locator(".top-bar-actions a:not([href])")).toHaveCount(0);
  });
});

test.describe("no staging scaffolding is visible to the client", () => {
  test("no STAGING PREVIEW / STAGING ONLY badges anywhere on the home page", async ({ page }) => {
    await open(page, "/");
    const body = (await page.locator("body").innerText()).toUpperCase();
    expect(body).not.toContain("STAGING PREVIEW");
    expect(body).not.toContain("STAGING ONLY");
  });
});
