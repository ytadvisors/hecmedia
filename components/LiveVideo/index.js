import React from "react";
import moment from "moment";

export default ({ video: { url, title, startDate } = {} }) => (
  <article className="live-video">
    {url && (
      <div className="video-details">
        <div className="container">
          <div className="live-tab">Live</div>
          <div className="live-details">
            <div>{title}</div>
            <div>{moment(startDate).fromNow()}</div>
          </div>
        </div>
      </div>
    )}
  </article>
);
