import { loadRecaptchaScript } from "./loadRecaptcha";

describe("loadRecaptchaScript", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    delete window.onloadCallback;
  });

  it("injects the explicit-render script once", () => {
    loadRecaptchaScript();
    loadRecaptchaScript();
    const scripts = document.querySelectorAll(
      'script[src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit"]'
    );
    expect(scripts).toHaveLength(1);
    expect(typeof window.onloadCallback).toBe("function");
  });
});
