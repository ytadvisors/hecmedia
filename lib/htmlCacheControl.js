const PERSONALIZED_COOKIE = /wordpress_logged_in_|wp-postpass_|comment_author_/i;
const { ANONYMOUS_HTML_CACHE_CONTROL } = require("./cachePolicy");

export { ANONYMOUS_HTML_CACHE_CONTROL };

export const PRIVATE_HTML_CACHE_CONTROL = "private, no-store";

export const isPersonalizedRequest = cookieHeader =>
  PERSONALIZED_COOKIE.test(String(cookieHeader || ""));

export const htmlCacheControlForRequest = req => {
  if (!req || req.method !== "GET") return PRIVATE_HTML_CACHE_CONTROL;
  if (isPersonalizedRequest(req.headers && req.headers.cookie)) {
    return PRIVATE_HTML_CACHE_CONTROL;
  }
  return ANONYMOUS_HTML_CACHE_CONTROL;
};

export const applyHtmlCacheControl = (req, res) => {
  if (!res || res.headersSent || typeof res.setHeader !== "function") return;
  res.setHeader("Cache-Control", htmlCacheControlForRequest(req));
};
