import React from "react";
import VideoPlayer from "../VideoPlayer/index";
import ReviewedContent from "../ReviewedContent";

export default ({ post: { content, videoUrl }, containerStyle }) => (
  <section className="content">
    {videoUrl && <VideoPlayer url={videoUrl} containerStyle={containerStyle} />}
    <ReviewedContent content={content} />
  </section>
);
