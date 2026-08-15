const RECAPTCHA_SRC =
  "https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit";

export const ensureRecaptchaOnloadCallback = () => {
  if (typeof window === "undefined") return;
  if (typeof window.onloadCallback !== "function") {
    window.onloadCallback = () => {};
  }
};

export const loadRecaptchaScript = () => {
  if (typeof document === "undefined") return;
  ensureRecaptchaOnloadCallback();
  if (document.querySelector(`script[src="${RECAPTCHA_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = RECAPTCHA_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
};
