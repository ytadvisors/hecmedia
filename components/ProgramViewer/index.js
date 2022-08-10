import React, { Component } from "react";
import $ from "jquery";

import SideNavigation from "../SideNavigation";
import ListOfSideTabs from "../ListOfSideTabs";
import ListOfFeaturedPosts from "../ListOfFeaturedPosts";

import Schedule from "../Schedule";
import NewsLetterContainer from "../../containers/NewsLetterContainer";
import SignUp from "../SignUp";
import "./styles.scss";

const spotlightImg = "/static/assets/spotlight-img.jpg";

export default class extends Component {
  constructor(props) {
    super(props);
    this.mounted = true;
    this.state = {
      isMobile: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    $("#main-nav > div:first-child").addClass("main-container");
    this.setState({ isMobile: window.innerWidth <= 1170 });
    window.addEventListener("resize", this.resize);
  }

  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener("resize", this.resize);
  }

  resize = () => {
    if (this.mounted) this.setState({ isMobile: window.innerWidth <= 1170 });
  };

  render() {
    const {
      style,
      programs,
      featuredMagazines,
      spotLightPosts,
      children
    } = this.props;
    const { isMobile } = this.state;
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
                    <a href="/posts/as-seen-on-spotlight" className="container">
                      <img
                        src={spotlightImg}
                        alt="Link to the spotlight"
                        className="img-responsive"
                      />
                    </a>
                    {!isMobile && (
                      <ListOfSideTabs
                        currentTab="HEC-TV NewsLetter"
                        tabs={[
                          {
                            title: "Sign Up",
                            content: <SignUp />
                          },
                          {
                            title: "HEC-TV NewsLetter",
                            content: <NewsLetterContainer />
                          }
                        ]}
                      />
                    )}
                  </div>
                </div>
                <div className="row">
                  <div className="col-sm-4 col-sm-push-8 col-lg-12 col-lg-push-0 no-padding">
                    <Schedule programs={programs} />
                  </div>
                  <div className="col-sm-8 col-sm-pull-4  col-lg-12 col-lg-pull-0  no-padding">
                    <ListOfFeaturedPosts
                      featuredMagazines={featuredMagazines}
                      spotLightPosts={spotLightPosts}
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
