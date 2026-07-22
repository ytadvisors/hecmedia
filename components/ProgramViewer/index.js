import React, { Component } from "react";
import $ from "jquery";

import SideNavigation from "../SideNavigation";
import TrendingNow from "../TrendingNow";

import Schedule from "../Schedule";
import "./styles.scss";

export default class extends Component {
  componentDidMount() {
    $("#main-nav > div:first-child").addClass("main-container");
  }

  render() {
    const {
      style,
      programs,
      spotLightPosts,
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
            <div className="col-lg-9 no-padding list-container">
              <div className="clearfix">{children}</div>
            </div>
            <div className="col-lg-3 no-padding">
              <SideNavigation>
                <div className="row">
                  <div className="col-lg-12 col-lg-pull-0  no-padding">
                    <a href="/spotlight" className="educators-card">
                      <span
                        className="educators-card__notebook"
                        aria-hidden="true"
                      />
                      <span>For Educators</span>
                    </a>
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-4 col-sm-push-8 col-lg-12 col-lg-push-0 no-padding">
                    <Schedule programs={programs} />
                  </div>
                  <div className="col-sm-8 col-sm-pull-4  col-lg-12 col-lg-pull-0  no-padding">
                    <TrendingNow
                      spotlightPosts={spotLightPosts}
                      loading={trendingNowLoading}
                      error={trendingNowError}
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
