import React from "react";
import VideoPlayer from "../VideoPlayer/index";
import "./styles.scss";

export default ({ post: { content, videoUrl }, containerStyle }) => (
  <section className="content">
    {videoUrl && <VideoPlayer url={videoUrl} containerStyle={containerStyle} />}
    <span dangerouslySetInnerHTML={{ __html: content }} />
  </section>
);
