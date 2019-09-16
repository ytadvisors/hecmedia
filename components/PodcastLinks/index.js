import React from "react";
import shortid from "shortid";

import "./styles.scss";

const getPodcastListItem = ({ title, url }) => {
  let listClass = "";
  switch (title) {
    case "Apple Podcasts":
      listClass = "apple-link";
      break;
    case "Stitcher":
      listClass = "stitcher-link";
      break;
    case "Google Play":
      listClass = "google-link";
      break;
    case "Tune In":
      listClass = "tunein-link";
      break;
    case "Spotify":
      listClass = "spotify-link";
      break;
    case "RSS":
      listClass = "rss-link";
      break;
    default:
      listClass = "";
  }

  return (
    <li className="podcast" key={shortid.generate()}>
      <a
        href={url}
        className={`${listClass} `}
        target="_blank"
        rel="noopener noreferrer"
      >
        {" "}
        {""}
      </a>
    </li>
  );
};

export default ({ podcasts }) => (
  <section className="podcast-links">
    {podcasts && podcasts.length > 0 && (
      <ul>
        <li className="subscribe-label">Subscribe:</li>
        {podcasts.map(obj => getPodcastListItem(obj))}
      </ul>
    )}
  </section>
);
