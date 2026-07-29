import React, { Component } from "react";
import $ from "jquery";

import SideNavigation from "../SideNavigation";
import TrendingNow from "../TrendingNow";
import ListOfFeaturedPosts from "../ListOfFeaturedPosts";
import "./styles.scss";

export default class extends Component {
  componentDidMount() {
    $("#main-nav > div:first-child").addClass("main-container");
  }

  render() {
    const {
      style,
      spotLightPosts,
      featuredVideos,
      newestVideos,
      trendingNowLoading,
      trendingNowError,
      children
    } = this.props;
    return (
      <section className="program-viewer">
        <div
          className="container no-padding program-viewer-container"
          style={style}
        >
          <div className="row">
            <div className="col-lg-9 no-padding list-container program-viewer-main">
              <div className="clearfix">{children}</div>
            </div>
            <div className="col-lg-3 no-padding program-viewer-rail">
              <SideNavigation>
                <div className="row">
                  <div className="col-lg-12 no-padding">
                    <TrendingNow
                      featuredVideos={featuredVideos}
                      newestVideos={newestVideos}
                      loading={trendingNowLoading}
                      error={trendingNowError}
                    />
                  </div>
                  <div className="col-lg-12 no-padding">
                    <ListOfFeaturedPosts
                      title="Spotlight STL"
                      titleHref={null}
                      spotLightPosts={spotLightPosts}
                      maxItems={5}
                    />
                  </div>
                </div>
              </SideNavigation>
            </div>
          </div>
        </div>
      </section>
    );
  }
}
