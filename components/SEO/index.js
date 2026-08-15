import React from "react";
import Head from "next/head";
import TagManager from "../TagManager";
import { decodeHTML } from "../../lib/updateFunctions";

export default ({
  fbAppId,
  description,
  image,
  title,
  siteName = "hecmedia.org",
  pathname,
  twitterHandle = "@hec_tv",
  categories,
  url,
  preloadImage,
  preloadImageSrcSet,
  preloadImageSizes
}) => (
  <>
    <Head>
      <title>{title ? decodeHTML(title) : "HEC-TV | Home"}</title>
      <meta
        name="description"
        content={
          description || "On Demand Arts, Culture & Education Programming"
        }
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:image" content={image || ""} />
      <meta property="og:title" content={decodeHTML(title || "")} />
      <meta property="og:image:width" content="650" />
      <meta property="og:image:height" content="497" />
      <meta property="og:siteName" content={siteName || ""} />
      <meta property="og:locale'" content="en_US" />
      <meta property="og:url" content={`${url}${pathname}`} />
      <meta property="og:type" content="article" />
      <meta property="og:description" content={decodeHTML(description || "")} />
      <meta property="og:type" content="article" />
      <meta property="fb:app_id" content={fbAppId || ""} />

      <meta name="twitter:image" content={image || ""} />
      <meta name="twitter:title" content={decodeHTML(title || "")} />
      <meta
        name="twitter:description"
        content={decodeHTML(description || "")}
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content={twitterHandle || ""} />
      <meta charSet="utf-8" />
      <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      {preloadImage ? (
        <link
          rel="preload"
          as="image"
          href={preloadImage}
          imageSrcSet={preloadImageSrcSet}
          imageSizes={preloadImageSizes}
        />
      ) : null}
      <link
        rel="stylesheet"
        href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"
        integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick.min.css"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.1/slick-theme.min.css"
        crossOrigin="anonymous"
      />

      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/static/favicons/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/static/favicons/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/static/favicons/favicon-16x16.png"
      />
      <link rel="shortcut icon" href="/static/favicons/favicon-16x16.png" />
      <link rel="manifest" href="/static/favicons/site.webmanifest" />
      <link
        rel="mask-icon"
        href="/static/favicons/safari-pinned-tab.svg"
        color="#5bbad5"
      />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#ffffff" />
      {categories && (
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        pageCategory: ${JSON.stringify(categories)},
        event : "postCategory"
      });
    `
          }}
        />
      )}
    </Head>

    <TagManager />
  </>
);
