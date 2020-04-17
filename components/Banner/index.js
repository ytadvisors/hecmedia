import React, { Component } from "react";
import moment from "moment";
import Link from "next/link";
import { getExcerpt, cleanUrl } from "../../lib/updateFunctions";
import { isServer } from "../../lib/serverFunctions";

import "./styles.scss";

const playButton = "/static/assets/play-button.png";

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
    const { liveVideo } = this.props;
    const { isMobile } = this.state;

    const {
      title = "",
      temporaryLink: { startDate, url, showTime, bannerTitle } = {}
    } = liveVideo || {};

    let formattedUrl = url;
    let redirect = true;
    if (url && url.indexOf(process.env.SITE_HOST) !== -1) {
      formattedUrl = cleanUrl(url);
      redirect = false;
    }

    const excerpt = (
      <div>
        <div>{getExcerpt(title, isMobile ? 25 : 150)}</div>
        <div className="breaker">.&nbsp;</div>
        {showTime && <div>{moment(startDate).format("MMM Do, h:mma")} CT</div>}
      </div>
    );

    return (
      <section className="banner">
        {title && url && startDate && (
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
                      <i>{bannerTitle}</i>
                    </a>
                  ) : (
                    <Link href={formattedUrl}>
                      <a>
                        <i>{bannerTitle}</i>
                      </a>
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
                    <Link href={formattedUrl}>
                      <a>Live</a>
                    </Link>
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
                    <Link href={formattedUrl}>
                      <a>{excerpt}</a>
                    </Link>
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
