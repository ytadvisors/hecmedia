import * as types from "../types/pageTypes";
import {
  changePageAction,
  changeOverlayStepAction,
  loadHeaderMenuAction,
  loadSocialMenuAction,
  loadBottomNavMenuAction,
  loadFooterMenuAction,
  loadPageAction,
  loadPricingPlansAction,
  openOverlayAction,
  setPageOperation,
  closeOverlayAction,
  setData
} from "./pageActions";

describe("pageActions", () => {
  it("creates a change-page action", () => {
    expect(changePageAction("home")).toEqual({
      type: types.CHANGE_PAGE,
      currentPage: "home"
    });
  });

  it("creates a change-overlay-step action", () => {
    expect(changeOverlayStepAction(2)).toEqual({
      type: types.CHANGE_OVERLAY_STEP,
      currentStep: 2
    });
  });

  it("creates menu-loading actions with default slugs", () => {
    expect(loadHeaderMenuAction()).toEqual({
      type: types.LOAD_HEADER_MENU,
      menu_slug: "header"
    });
    expect(loadSocialMenuAction()).toEqual({
      type: types.LOAD_SOCIAL_MENU,
      menu_slug: "social"
    });
    expect(loadBottomNavMenuAction()).toEqual({
      type: types.LOAD_BOTTOM_NAV_MENU,
      menu_slug: "bottomnav"
    });
    expect(loadFooterMenuAction()).toEqual({
      type: types.LOAD_FOOTER_MENU,
      menu_slug: "footer"
    });
  });

  it("creates a load-page action", () => {
    expect(loadPageAction("about")).toEqual({
      type: types.LOAD_PAGE,
      pageName: "about"
    });
  });

  it("creates a load-pricing-plans action with a default page", () => {
    expect(loadPricingPlansAction()).toEqual({
      type: types.LOAD_PRICING,
      page: 1
    });
  });

  it("creates an open-overlay action with default settings", () => {
    expect(openOverlayAction("signup")).toEqual({
      type: types.OPEN_OVERLAY,
      overlayName: "signup",
      overlaySettings: {}
    });
  });

  it("creates a set-page-operation action", () => {
    expect(setPageOperation("edit")).toEqual({
      type: types.SET_PAGE_OPERATION,
      operation: "edit"
    });
  });

  it("creates a close-overlay action", () => {
    expect(closeOverlayAction()).toEqual({ type: types.CLOSE_OVERLAY });
  });

  it("creates a set-data action", () => {
    expect(setData({ foo: "bar" })).toEqual({
      type: types.SET_DATA,
      data: { foo: "bar" }
    });
  });
});
