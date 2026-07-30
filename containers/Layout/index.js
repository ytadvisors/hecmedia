import React, { useState } from "react";
import { connect } from "react-redux";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { Router } from "../../routes";
import {
  GET_LAYOUT,
  GET_HEADER_MENU,
  GET_LIVE_VIDEOS,
  GET_TOPBAR_CTAS,
  GET_HECTV_SITE_CONTENT,
  GET_CURATED_TRENDING_POSTS,
  GET_NEWEST_VIDEOS,
  GET_FEATURED_VIDEOS
} from "../../lib/graphql";
import ProgramViewer from "../../components/ProgramViewer";
import Header from "../../components/Header";
import Banner from "../../components/Banner";
import Footer from "../../components/Footer";
import BottomNav from "../../components/BottomNav/index";
import { setPlayingLiveAction } from "../../store/actions/postActions";
import {
  getFallbackTopbarCtas,
  modernWpGraphqlEnabled,
  normalizeSiteContent,
  railPromoFromSiteContent,
  orderPostsByIds
} from "../../lib/stagingCompatibility";

import { BasicModal } from "../Modals";

export const Layout = props => {
  const { pageForm: { search: { values } = {} } = {}, dispatch } = props;

  const [currentlyPlaying, setPlaying] = useState(false);

  const searchFunc = () => {
    if (values && values.search) {
      Router.pushRoute(`/search/${values.search}`);
    }
  };

  const mDay = moment(new Date());

  const currentDate = moment(mDay)
    .format("YYYY-MM-DD HH:mm:ss")
    .toLowerCase();

  const compareStart = currentDate;
  const compareEnd = currentDate;
  const keyStart = "display_date";
  const keyEnd = "end_date";
  const modernCms = modernWpGraphqlEnabled();

  const { data } = useQuery(GET_LAYOUT, {
    notifyOnNetworkStatusChange: true
  });

  const { data: headerData } = useQuery(GET_HEADER_MENU, {
    notifyOnNetworkStatusChange: true,
    skip: !modernCms,
    errorPolicy: "all"
  });

  // This custom WordPress field deploys independently. Keeping it in a
  // separate operation means an unavailable field cannot blank the shell.
  const { data: topbarData } = useQuery(GET_TOPBAR_CTAS, {
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all"
  });

  const { data: siteContentData } = useQuery(GET_HECTV_SITE_CONTENT, {
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all"
  });
  const siteContent = normalizeSiteContent(
    siteContentData && siteContentData.hectvSiteContent
  );

  // Editorial curation is optional. The newest-video feed remains the
  // fallback, and both stay independent from the shell query so an older CMS
  // schema cannot blank the page.
  const {
    data: newestVideosData,
    loading: newestVideosLoading,
    error: newestVideosError
  } = useQuery(GET_NEWEST_VIDEOS, {
    notifyOnNetworkStatusChange: true
  });

  const { data: featuredVideosData } = useQuery(GET_FEATURED_VIDEOS, {
    notifyOnNetworkStatusChange: true,
    skip: !modernCms,
    errorPolicy: "all"
  });

  const { data: curatedTrendingData } = useQuery(GET_CURATED_TRENDING_POSTS, {
    variables: { ids: siteContent.trendingPostIds },
    skip: siteContent.trendingPostIds.length === 0,
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all"
  });

  const { data: videos } = useQuery(GET_LIVE_VIDEOS, {
    variables: { keyStart, keyEnd, compareStart, compareEnd },
    notifyOnNetworkStatusChange: true
  });

  const {
    social,
    footer,
    featuredMagazines,
    spotLight: { nodes: spotLightPosts = [] } = {}
  } = data || {};
  const header = (headerData && headerData.header) || (data && data.header);
  const topbarCtas =
    (topbarData && topbarData.topbarCtas) || getFallbackTopbarCtas();
  const newestVideos =
    (newestVideosData &&
      newestVideosData.newestVideos &&
      newestVideosData.newestVideos.nodes) ||
    [];
  const { featuredVideos: modernFeaturedVideos = [] } =
    featuredVideosData || {};
  const curatedTrendingPosts = orderPostsByIds(
    curatedTrendingData &&
      curatedTrendingData.curatedTrendingPosts &&
      curatedTrendingData.curatedTrendingPosts.nodes,
    siteContent.trendingPostIds
  );
  const featuredVideos =
    curatedTrendingPosts.length > 0
      ? curatedTrendingPosts
      : modernFeaturedVideos;
  const { children, showBottomNav, absContent, style } = props;
  const { liveVideos } = videos || [];
  let liveVideo = {};
  if (liveVideos && liveVideos.edges.length > 0) {
    [liveVideo] = liveVideos.edges.map(obj => obj.node);
    if (!currentlyPlaying) {
      setPlaying(true);
      dispatch(setPlayingLiveAction(liveVideo));
    }
  }

  return (
    <>
      <div className="layout">
        {absContent}
        <Header
          searchFunc={searchFunc}
          header={header}
          social={social}
          topbarCtas={topbarCtas}
        />
        <Banner liveVideo={liveVideo} />
        <ProgramViewer
          style={style}
          featuredMagazines={featuredMagazines}
          spotLightPosts={spotLightPosts}
          featuredVideos={featuredVideos}
          newestVideos={newestVideos}
          trendingNowLoading={newestVideosLoading}
          trendingNowError={newestVideosError}
          railPromo={railPromoFromSiteContent(siteContent)}
          spotlightTitle={siteContent.spotlightTitle}
          mobileRailFirst={siteContent.mobileRailFirst}
        >
          {children}
          {showBottomNav && (
            <BottomNav title="more from" links={siteContent.footerLinks} />
          )}
        </ProgramViewer>
        <Footer footer={footer} social={social} />
        <BasicModal {...props} />
      </div>
    </>
  );
};

const mapStateToProps = state => ({
  overlaySettings: state.pageReducers.overlaySettings,
  openOverlay: state.pageReducers.openOverlay,
  playingLive: state.postReducers.playingLive,
  pageForm: state.form
});

export default connect(mapStateToProps)(Layout);
