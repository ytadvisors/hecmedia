import React from "react";
import Head from "next/head";
import { decodeHTML } from "../../lib/stringFunctions";

export default ({
  fbAppId,
  description,
  image,
  title,
  siteName,
  pathname,
  twitterHandle,
  categories,
  url
}) => (
  <Head>
    <title>{title || "HEC-TV | Home"}</title>
    <meta
      name="description"
      content={description || "On Demand Arts, Culture & Education Programming"}
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
    <meta name="twitter:description" content={decodeHTML(description || "")} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:creator" content={twitterHandle || ""} />
    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="/favicons/apple-touch-icon.png"
    />
    <link
      rel="icon"
      type="image/png"
      sizes="32x32"
      href="/favicons/favicon-32x32.png"
    />
    <link
      rel="icon"
      type="image/png"
      sizes="16x16"
      href="/favicons/favicon-16x16.png"
    />
    <link rel="shortcut icon" href="/favicons/favicon-16x16.png" />
    <link rel="manifest" href="/favicons/site.webmanifest" />
    <link
      rel="mask-icon"
      href="/favicons/safari-pinned-tab.svg"
      color="#5bbad5"
    />
    <meta name="msapplication-TileColor" content="#da532c" />
    <meta name="theme-color" content="#ffffff" />
    {categories && (
      <script type="text/javascript">{`
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        pageCategory: ${JSON.stringify(categories)},
        event : "postCategory"
      });
    `}</script>
    )}
  </Head>
);
