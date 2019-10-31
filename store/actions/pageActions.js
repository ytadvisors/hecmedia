import * as types from "../types/pageTypes";

export const changePageAction = currentPage => ({
  type: types.CHANGE_PAGE,
  currentPage
});

export const changeOverlayStepAction = currentStep => ({
  type: types.CHANGE_OVERLAY_STEP,
  currentStep
});

export const loadHeaderMenuAction = (menu_slug = "header") => ({
  type: types.LOAD_HEADER_MENU,
  menu_slug
});

export const loadSocialMenuAction = (menu_slug = "social") => ({
  type: types.LOAD_SOCIAL_MENU,
  menu_slug
});

export const loadBottomNavMenuAction = (menu_slug = "bottomnav") => ({
  type: types.LOAD_BOTTOM_NAV_MENU,
  menu_slug
});

export const loadFooterMenuAction = (menu_slug = "footer") => ({
  type: types.LOAD_FOOTER_MENU,
  menu_slug
});

export const loadPageAction = pageName => ({
  type: types.LOAD_PAGE,
  pageName
});

export const loadPricingPlansAction = (page = 1) => ({
  type: types.LOAD_PRICING,
  page
});

export const openOverlayAction = (overlayName, overlaySettings = {}) => ({
  type: types.OPEN_OVERLAY,
  overlayName,
  overlaySettings
});

export const setPageOperation = operation => ({
  type: types.SET_PAGE_OPERATION,
  operation
});

export const closeOverlayAction = () => ({
  type: types.CLOSE_OVERLAY
});

export const setData = data => ({
  type: types.SET_DATA,
  data
});
