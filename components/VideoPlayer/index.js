import React, { Component } from "react";
import ReactPlayer from "react-player";
import { Button } from "react-bootstrap";

export default class VideoPlayer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      videoStarted: false
    };
  }

  startVideo = () => {
    this.setState({ videoStarted: true });
  };

  render() {
    const {
      videoStyle,
      containerStyle,
      thumbnail,
      url,
      playing,
      videoCallback,
      embedUrl
    } = this.props;
    const { videoStarted } = this.state;
    let videoPreview = "";
    const showThumbnail = !videoStarted && thumbnail;

    if (showThumbnail) {
      videoPreview = (
        <Button
          className="full-width video-preview"
          onClick={this.startVideo}
          style={{ backgroundImage: `url('${thumbnail}')` }}
        />
      );
    } else {
      videoPreview = !embedUrl ? (
        <div className="video-container">
          <div className="player-wrapper">
            <ReactPlayer
              key={url}
              controls
              url={url}
              className="react-player"
              height="100%"
              width="100%"
              style={videoStyle}
              playing={playing || thumbnail}
              onEnded={videoCallback}
              data-vimeo-responsive="1"
            />
          </div>
        </div>
      ) : (
        <div
          className="video-stream"
          dangerouslySetInnerHTML={{ __html: embedUrl }}
        />
      );
    }

    return (
      <section className="video-player fluid ">
        <div className="row" />
        <div className="video-container" style={containerStyle}>
          {videoPreview}
        </div>
      </section>
    );
  }
}
