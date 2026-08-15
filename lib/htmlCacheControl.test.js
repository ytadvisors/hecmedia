import {
  ANONYMOUS_HTML_CACHE_CONTROL,
  PRIVATE_HTML_CACHE_CONTROL,
  htmlCacheControlForRequest,
  applyHtmlCacheControl
} from "./htmlCacheControl";

describe("htmlCacheControl", () => {
  it("caches anonymous GET HTML at the edge", () => {
    expect(htmlCacheControlForRequest({ method: "GET", headers: {} })).toBe(
      ANONYMOUS_HTML_CACHE_CONTROL
    );
  });

  it("does not cache logged-in WordPress sessions", () => {
    expect(
      htmlCacheControlForRequest({
        method: "GET",
        headers: { cookie: "wordpress_logged_in_abc=1" }
      })
    ).toBe(PRIVATE_HTML_CACHE_CONTROL);
  });

  it("sets the header when the response is still open", () => {
    const headers = {};
    applyHtmlCacheControl(
      { method: "GET", headers: {} },
      {
        headersSent: false,
        setHeader: (k, v) => {
          headers[k] = v;
        }
      }
    );
    expect(headers["Cache-Control"]).toBe(ANONYMOUS_HTML_CACHE_CONTROL);
  });
});
