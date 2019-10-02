import React from "react";

export default ({ noScript }) => {
  if (!noScript) {
    const params =
      process.env.GA_TAGMANAGER_ENV_AUTH_STRING &&
      process.env.GA_TAGMANAGER_ENV_PREVIEW_NAME
        ? `+'&gtm_auth=${process.env.GA_TAGMANAGER_ENV_AUTH_STRING}&gtm_preview=${process.env.GA_TAGMANAGER_ENV_PREVIEW_NAME}&gtm_cookies_win=x'`
        : "";
    return (
      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl${params};f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${process.env.GA_TAGMANAGER_ID}');`
        }}
      />
    );
  }
  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.GA_TAGMANAGER_ID}"
                      height="0" width="0" style="display:none;visibility:hidden"></iframe>`
      }}
    />
  );
};
