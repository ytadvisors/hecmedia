import React from "react";
import VideoPlayer from "../VideoPlayer";
import ShareSocialLinks from "../ShareSocialLinks";
import { cleanUrl } from "../../lib/updateFunctions";

export default ({
  post: { title, videoUrl, link, content },
  children,
  videoCallback,
  isLiveVideo
}) => {
  const shareTitle = `Check out "${title}"`;
  const containerStyle = isLiveVideo
    ? {
        background: "#eee",
        padding: "20px",
        height: "auto",
        minHeight: "360px"
      }
    : { padding: "0" };

  const shareUrl = process.env.SITE_HOST + cleanUrl(link.replace(/\/$/, ""));

  return (
    <section className="post-container">
      <section>
        <div className="col-md-12 no-padding title">
          <h3 dangerouslySetInnerHTML={{ __html: title }} />
        </div>
      </section>
      <VideoPlayer
        url={videoUrl}
        containerStyle={containerStyle}
        videoCallback={videoCallback}
        isLiveVideo={isLiveVideo}
      />
      <div className="row share-link-container">
        <div className="pull-left">{children}</div>
        <div className="pull-right">
          <div className="social-link-text">Share</div>
          <div className="social-links">
            <ShareSocialLinks
              url={shareUrl}
              title={shareTitle}
              body={content}
            />
          </div>
        </div>
      </div>
      <div className="row blog-content">
        <p>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </p>
      </div>
    </section>
  );
};
