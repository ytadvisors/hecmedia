import React, { Component } from "react";
import moment from "moment";
import Link from "next/link";
import { getExcerpt, cleanUrl } from "../../lib/stringFunctions";
import { isServer } from "../../lib/serverFunctions";

import "./styles.scss";

export default class Banner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    if (!isServer) window.addEventListener("resize", this.resize);
    this.setState({ isMobile: !isServer && window.innerWidth <= 500 });
  }

  componentWillUnmount() {
    this.mounted = false;
    if (!isServer) window.removeEventListener("resize", this.resize);
  }

  resize = () => {
    if (this.mounted) {
      this.setState({ isMobile: !isServer && window.innerWidth <= 500 });
    }
  };

  render() {
    const { liveVideos = [] } = this.props;
    const { isMobile } = this.state;
    const playButton = "/static/assets/play-button.png";

    const { postTitle = "", acf: { startDate, url } = {} } =
      liveVideos.length > 0 ? liveVideos[0] : {};
    let formattedUrl = url;
    let redirect = true;
    if (url && url.indexOf(process.env.SITE_HOST) !== -1) {
      formattedUrl = cleanUrl(url);
      redirect = false;
    }

    const excerpt = (
      <div>
        <div>{getExcerpt(postTitle, isMobile ? 25 : 150)}</div>
        <div className="breaker">.&nbsp;</div>
        <div>{moment(new Date(startDate)).format("MMM, Do hh:mm a z")} CT</div>
      </div>
    );

    return (
      <section className="banner">
        {postTitle && url && startDate && (
          <div className="content">
            <div className="container">
              <ul className="live-info">
                <li className="watch vcenter no-mobile">
                  {redirect ? (
                    <a
                      href={formattedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i>Watch</i>
                    </a>
                  ) : (
                    <Link href={formattedUrl}>
                      <i>Watch</i>
                    </Link>
                  )}
                </li>
                <li className="live vcenter">
                  {redirect ? (
                    <a
                      href={formattedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Live
                    </a>
                  ) : (
                    <Link href={formattedUrl}>Live</Link>
                  )}
                </li>
                <li className="play vcenter no-mobile">
                  {redirect ? (
                    <a
                      href={formattedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={playButton} className="play-icon" alt="play" />
                    </a>
                  ) : (
                    <Link href={formattedUrl}>
                      <img src={playButton} className="play-icon" alt="play" />
                    </Link>
                  )}
                </li>
                <li className="banner-link vcenter">
                  {redirect ? (
                    <a
                      href={formattedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {" "}
                      {excerpt}{" "}
                    </a>
                  ) : (
                    <Link href={formattedUrl}> {excerpt} </Link>
                  )}
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>
    );
  }
}
