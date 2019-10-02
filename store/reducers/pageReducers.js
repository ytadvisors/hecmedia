import * as types from "../types/pageTypes";

const initialState = {
  currentPage: "home",
  currentTab: "",
  currentNavigationTab: "",
  currentStep: 0,
  error: false,
  pricingPlans: [],
  openOverlay: "",
  overlaySettings: {},
  menus: {},
  liveVideo: {},
  pageTitle: "",
  categoryTitle: "",
  pageOperation: "",
  pageData: {},
  data: {}
};

export default (curState = initialState, action) => {
  const state = { ...curState };
  switch (action.type) {
    case types.LOAD_PAGE:
    case types.LOAD_PRICING:
    case types.LOAD_BOTTOM_NAV_MENU:
    case types.LOAD_HEADER_MENU:
    case types.LOAD_LIVE_VIDEO:
      return {
        ...state,
        error: false
      };

    // Results
    case types.SET_PAGE:
      return {
        ...state,
        error: false,
        pageData: { ...state.pageData, ...action.pageData }
      };
    case types.SET_DATA:
      return {
        ...state,
        error: false,
        data: { ...action.data }
      };
    case types.SET_PAGE_TITLE:
      return {
        ...state,
        pageTitle: action.title,
        error: false
      };
    case types.SET_CATEGORY_TITLE:
      return {
        ...state,
        categoryTitle: action.title,
        error: false
      };
    case types.SET_PRICING:
      return {
        ...state,
        pricingPlans: action.pricingPlans
      };
    case types.SET_MENU:
      return {
        ...state,
        menus: { ...state.menus, ...action.menus }
      };
    case types.SET_LIVE_VIDEO:
      return {
        ...state,
        liveVideo: action.liveVideo
      };
    case types.SET_PAGE_OPERATION:
      return {
        ...state,
        pageOperation: action.operation
      };

    // Non Async Requests

    case types.CHANGE_PAGE:
      return {
        ...state,
        currentPage: action.currentPage
      };

    case types.CHANGE_NAVIGATION_TAB:
      return {
        ...state,
        currentNavigationTab: action.currentNavigationTab
      };

    case types.CHANGE_TAB:
      return {
        ...state,
        currentTab: action.currentTab
      };

    case types.CHANGE_OVERLAY_STEP:
      return {
        ...state,
        currentStep: action.currentStep
      };
    case types.OPEN_OVERLAY:
      delete state.overlaySettings;
      return {
        ...state,
        openOverlay: action.overlayName,
        overlaySettings: action.overlaySettings
      };
    case types.CLOSE_OVERLAY:
      return {
        ...state,
        openOverlay: ""
      };

    // Error
    case types.CHANGE_PAGE_ERROR:
      return {
        ...state,
        error: true
      };
    default:
      return state;
  }
};
