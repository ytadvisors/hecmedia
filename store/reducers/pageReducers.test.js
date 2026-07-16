import reducer from "./pageReducers";
import * as types from "../types/pageTypes";

describe("pageReducers", () => {
  it("returns the initial state for an unknown action", () => {
    const state = reducer(undefined, { type: "@@INIT" });

    expect(state.currentPage).toBe("");
    expect(state.pricingPlans).toEqual([]);
    expect(state.error).toBe(false);
  });

  it("clears the error flag on load-type actions", () => {
    const state = reducer(
      { ...reducer(undefined, {}), error: true },
      { type: types.LOAD_PAGE }
    );

    expect(state.error).toBe(false);
  });

  it("merges page data on SET_PAGE", () => {
    const seeded = reducer(undefined, {
      type: types.SET_PAGE,
      pageData: { title: "Home" }
    });
    const state = reducer(seeded, {
      type: types.SET_PAGE,
      pageData: { subtitle: "Welcome" }
    });

    expect(state.pageData).toEqual({ title: "Home", subtitle: "Welcome" });
  });

  it("replaces data on SET_DATA", () => {
    const state = reducer(undefined, {
      type: types.SET_DATA,
      data: { foo: "bar" }
    });

    expect(state.data).toEqual({ foo: "bar" });
  });

  it("sets the page and category titles", () => {
    const state = reducer(
      reducer(undefined, { type: types.SET_PAGE_TITLE, title: "Home" }),
      { type: types.SET_CATEGORY_TITLE, title: "News" }
    );

    expect(state.pageTitle).toBe("Home");
    expect(state.categoryTitle).toBe("News");
  });

  it("sets pricing plans and menus", () => {
    const withPricing = reducer(undefined, {
      type: types.SET_PRICING,
      pricingPlans: [{ id: 1 }]
    });
    const withMenu = reducer(withPricing, {
      type: types.SET_MENU,
      menus: { header: { id: 1 } }
    });

    expect(withMenu.pricingPlans).toEqual([{ id: 1 }]);
    expect(withMenu.menus).toEqual({ header: { id: 1 } });
  });

  it("sets the live video and page operation", () => {
    const state = reducer(
      reducer(undefined, { type: types.SET_LIVE_VIDEO, liveVideo: { id: 1 } }),
      { type: types.SET_PAGE_OPERATION, operation: "edit" }
    );

    expect(state.liveVideo).toEqual({ id: 1 });
    expect(state.pageOperation).toBe("edit");
  });

  it("changes the current page, tab, and navigation tab", () => {
    const state = [
      { type: types.CHANGE_PAGE, currentPage: "home" },
      { type: types.CHANGE_TAB, currentTab: "videos" },
      { type: types.CHANGE_NAVIGATION_TAB, currentNavigationTab: "main" }
    ].reduce(reducer, undefined);

    expect(state.currentPage).toBe("home");
    expect(state.currentTab).toBe("videos");
    expect(state.currentNavigationTab).toBe("main");
  });

  it("changes the overlay step", () => {
    const state = reducer(undefined, {
      type: types.CHANGE_OVERLAY_STEP,
      currentStep: 2
    });

    expect(state.currentStep).toBe(2);
  });

  it("opens and closes the overlay", () => {
    const opened = reducer(undefined, {
      type: types.OPEN_OVERLAY,
      overlayName: "signup",
      overlaySettings: { step: 1 }
    });

    expect(opened.openOverlay).toBe("signup");
    expect(opened.overlaySettings).toEqual({ step: 1 });

    const closed = reducer(opened, { type: types.CLOSE_OVERLAY });

    expect(closed.openOverlay).toBe("");
  });

  it("sets the error flag on CHANGE_PAGE_ERROR", () => {
    const state = reducer(undefined, { type: types.CHANGE_PAGE_ERROR });

    expect(state.error).toBe(true);
  });
});
