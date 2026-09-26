const PAYPAL_DONATE_SDK =
  "https://www.paypalobjects.com/donate/sdk/donate-sdk.js";
const STATE_KEY = "__hecReviewedContentScripts";

const state = () => {
  if (typeof window === "undefined") return null;
  if (!window[STATE_KEY]) {
    window[STATE_KEY] = {
      navigationId: 0,
      executedRoutes: {},
      paypalSdkPromise: null
    };
  }
  return window[STATE_KEY];
};

export const markClientNavigation = () => {
  const current = state();
  if (current) current.navigationId += 1;
};

const isReviewedPayPalInlineScript = script =>
  !script.src && /PayPal\.Donation\.Button\s*\(/.test(script.textContent || "");

const ensurePayPalSdk = current => {
  const reviewedState = current;
  if (
    window.PayPal &&
    window.PayPal.Donation &&
    window.PayPal.Donation.Button
  ) {
    return Promise.resolve();
  }
  if (reviewedState.paypalSdkPromise) return reviewedState.paypalSdkPromise;

  reviewedState.paypalSdkPromise = new Promise((resolve, reject) => {
    const activeScript = document.createElement("script");
    activeScript.src = PAYPAL_DONATE_SDK;
    activeScript.charset = "UTF-8";
    activeScript.dataset.hecReviewedContentScript = "paypal-sdk";
    activeScript.onload = resolve;
    activeScript.onerror = () => {
      reviewedState.paypalSdkPromise = null;
      reject(new Error("The reviewed PayPal Donate SDK failed to load."));
    };
    document.head.appendChild(activeScript);
  });

  return reviewedState.paypalSdkPromise;
};

export const executeReviewedContentScripts = async root => {
  const current = state();
  if (!current || !root || current.navigationId === 0) return false;
  const contentRoot = root;

  const scripts = Array.from(contentRoot.querySelectorAll("script"));
  const hasReviewedSdk = scripts.some(
    script => script.src === PAYPAL_DONATE_SDK
  );
  const inlineScripts = scripts.filter(isReviewedPayPalInlineScript);
  if (!hasReviewedSdk || inlineScripts.length === 0) return false;

  const route = `${window.location.pathname}${window.location.search}`;
  const executionKey = `${current.navigationId}:${route}`;
  if (current.executedRoutes[executionKey]) return false;
  current.executedRoutes[executionKey] = true;

  try {
    await ensurePayPalSdk(current);
    inlineScripts.forEach(script => {
      const executable = document.createElement("script");
      executable.dataset.hecReviewedContentScript = "paypal-inline";
      executable.textContent = script.textContent;
      script.replaceWith(executable);
    });
    contentRoot.dataset.hecReviewedContentScriptsExecuted = String(
      current.navigationId
    );
    return true;
  } catch (error) {
    delete current.executedRoutes[executionKey];
    throw error;
  }
};

export const resetReviewedContentScriptStateForTests = () => {
  if (typeof window !== "undefined") delete window[STATE_KEY];
};

export { PAYPAL_DONATE_SDK };
