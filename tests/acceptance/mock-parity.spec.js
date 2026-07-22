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

test.describe("(a) sticky header", () => {
  test("header is sticky and keeps its layout space", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header.header");
    await expect(header).toHaveClass(/header--sticky/);
    await expect(header).toHaveCSS("position", "sticky");
  });
});

test.describe("(b) rail promo replaces the Spotlight logo", () => {
  test("the old Spotlight logo is gone from the right rail", async ({ page }) => {
    await page.goto("/");
    const stale = page.locator(
      '.col-lg-3 img[alt*="spotlight" i], .col-lg-3 img[src*="spotlight" i]'
    );
    await expect(stale).toHaveCount(0);
  });

  test("a promo card renders with both an image and a link", async ({ page }) => {
    await page.goto("/");
    const promo = page.locator(".col-lg-3 a.rail-promo, .col-lg-3 a.educators-card");
    await expect(promo).toHaveCount(1);
    await expect(promo).toHaveAttribute("href", /.+/);
    await expect(promo.locator("img")).toHaveCount(1);
  });
});

test.describe("(c) Trending Now replaces the rail newsletter", () => {
  test("the newsletter signup is no longer in the right rail", async ({ page }) => {
    await page.goto("/");
    // "Replace" means the old one is gone. It lives on /newsletter now (req d).
    await expect(page.locator(".col-lg-3 form")).toHaveCount(0);
  });

  test("Trending Now renders thumbnails, per the mock", async ({ page }) => {
    await page.goto("/");
    const trending = page.locator("[class*=trending]").first();
    await expect(trending).toBeVisible();
    expect(await trending.locator("li").count()).toBeGreaterThan(0);
    expect(await trending.locator("img").count()).toBeGreaterThan(0);
  });

  test("Trending Now sits above the retained HEC-TV Spotlight list", async ({ page }) => {
    await page.goto("/");
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
    const res = await page.goto("/newsletter/thank-you");
    expect(res.status()).toBe(200);
  });
});

test.describe("(e) navigation sub-dropdowns", () => {
  test("a nested submenu exists and opens", async ({ page }) => {
    await page.goto("/");
    const parent = page.locator("#main-nav .dropdown-menu li").filter({
      has: page.locator(".dropdown-menu, ul")
    });
    expect(await parent.count()).toBeGreaterThan(0);
    await parent.first().hover();
    await expect(parent.first().locator(".dropdown-menu, ul").first()).toBeVisible();
  });

  test("top-level labels come from the CMS menu, matching the mock", async ({ page }) => {
    await page.goto("/");
    const labels = await page.$$eval("#main-nav .nav > li", items =>
      items.map(li => (li.textContent || "").trim().split("\n")[0].toUpperCase())
    );
    for (const expected of MOCK_NAV) expect(labels).toContain(expected);
  });
});

test.describe("(f) article header image sizing", () => {
  test("an article exposes a per-post header image size", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator("a[href*='/posts/']").first().getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href);
    await expect(
      page.locator("[data-header-image-size], [class*=header-image--]")
    ).toHaveCount(1);
  });
});

test.describe("(g) customizable top-bar buttons", () => {
  test("CTAs match the mock", async ({ page }) => {
    await page.goto("/");
    const labels = await page.$$eval(".top-bar-actions a, .top-bar-cta", els =>
      els.map(el => (el.textContent || "").trim().toUpperCase())
    );
    for (const expected of MOCK_CTAS) {
      expect(labels.some(l => l.includes(expected))).toBe(true);
    }
  });

  test("no dead CTAs — every one is a real link with an href", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".top-bar-actions button")).toHaveCount(0);
    await expect(page.locator(".top-bar-actions a:not([href])")).toHaveCount(0);
  });
});

test.describe("no staging scaffolding is visible to the client", () => {
  test("no STAGING PREVIEW / STAGING ONLY badges anywhere on the home page", async ({ page }) => {
    await page.goto("/");
    const body = (await page.locator("body").innerText()).toUpperCase();
    expect(body).not.toContain("STAGING PREVIEW");
    expect(body).not.toContain("STAGING ONLY");
  });
});
