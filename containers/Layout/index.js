import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { Router } from "../../routes";
import {
  GET_LAYOUT,
  GET_HEADER_MENU,
  GET_LEGACY_HEADER_MENU,
  GET_FOOTER_MENU,
  GET_SOCIAL_MENU,
  GET_LIVE_VIDEOS,
  GET_TOPBAR_CTAS,
  GET_HECTV_SITE_CONTENT,
  GET_CURATED_TRENDING_POSTS,
  GET_NEWEST_VIDEOS
} from "../../lib/graphql";
import ProgramViewer from "../../components/ProgramViewer";
import Header from "../../components/Header";
import Banner from "../../components/Banner";
import Footer, { getFooterMenuItemEdges } from "../../components/Footer";
import BottomNav from "../../components/BottomNav/index";
import { setPlayingLiveAction } from "../../store/actions/postActions";
import {
  DEFAULT_FOOTER_MENU_LINKS,
  getFallbackTopbarCtas,
  modernWpGraphqlEnabled,
  normalizeSiteContent,
  railPromoFromSiteContent,
  orderPostsByIds
} from "../../lib/stagingCompatibility";
import { fetchMenuBySlug } from "../../lib/wpMenuRest";

import { BasicModal } from "../Modals";

export const Layout = props => {
  const { pageForm: { search: { values } = {} } = {}, dispatch } = props;

  const [currentlyPlaying, setPlaying] = useState(false);
  // REST fallbacks when WPGraphQL hides unassigned menus (footer/social).
  const [restFooter, setRestFooter] = useState(null);
  const [restSocial, setRestSocial] = useState(null);

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

  const headerQuery = modernCms ? GET_HEADER_MENU : GET_LEGACY_HEADER_MENU;
  const { data: headerData } = useQuery(headerQuery, {
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all"
  });

  // Footer + social menus are dedicated queries (slug: footer / social) so the
  // footer always loads from the WordPress Footer menu under the new GraphQL
  // backend, independent of GET_LAYOUT spotlight data.
  const { data: footerMenuData } = useQuery(GET_FOOTER_MENU, {
    notifyOnNetworkStatusChange: true,
    errorPolicy: "all"
  });
  const { data: socialMenuData } = useQuery(GET_SOCIAL_MENU, {
    notifyOnNetworkStatusChange: true,
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

  // Editorial curation comes from hectvSiteContent.trendingPostIds. The
  // newest-video feed remains the fallback, and both stay independent from
  // the shell query so an older CMS schema cannot blank the page.
  const {
    data: newestVideosData,
    loading: newestVideosLoading,
    error: newestVideosError
  } = useQuery(GET_NEWEST_VIDEOS, {
    notifyOnNetworkStatusChange: true
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

  const { spotLight: { nodes: spotLightPosts = [] } = {} } = data || {};
  const header = (headerData && headerData.header) || (data && data.header);
  // Prefer isolated footer/social menu queries; fall back to GET_LAYOUT fields
  // only if an older shell still embeds them.
  const graphqlFooter =
    (footerMenuData && footerMenuData.footer) || (data && data.footer);
  const graphqlSocial =
    (socialMenuData && socialMenuData.social) || (data && data.social);

  // When GraphQL returns no footer/social items (unassigned menus are private
  // in WPGraphQL), load the classic menus via the public wp-api-menus REST API.
  useEffect(() => {
    let cancelled = false;
    const graphqlHasFooter = getFooterMenuItemEdges(graphqlFooter).length > 0;
    if (!graphqlHasFooter && !restFooter) {
      fetchMenuBySlug("footer").then(shape => {
        if (!cancelled && shape && getFooterMenuItemEdges(shape).length > 0) {
          setRestFooter(shape);
        }
      });
    }
    const socialEdges =
      graphqlSocial &&
      Array.isArray(graphqlSocial.edges) &&
      graphqlSocial.edges[0] &&
      graphqlSocial.edges[0].node &&
      graphqlSocial.edges[0].node.menuItems &&
      Array.isArray(graphqlSocial.edges[0].node.menuItems.edges)
        ? graphqlSocial.edges[0].node.menuItems.edges
        : [];
    if (socialEdges.length === 0 && !restSocial) {
      fetchMenuBySlug("social").then(shape => {
        if (!cancelled && shape && getFooterMenuItemEdges(shape).length > 0) {
          setRestSocial(shape);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [graphqlFooter, graphqlSocial]);

  const footer =
    getFooterMenuItemEdges(graphqlFooter).length > 0
      ? graphqlFooter
      : restFooter || graphqlFooter;
  const social =
    graphqlSocial &&
    Array.isArray(graphqlSocial.edges) &&
    graphqlSocial.edges[0] &&
    graphqlSocial.edges[0].node &&
    graphqlSocial.edges[0].node.menuItems &&
    Array.isArray(graphqlSocial.edges[0].node.menuItems.edges) &&
    graphqlSocial.edges[0].node.menuItems.edges.length > 0
      ? graphqlSocial
      : restSocial || graphqlSocial;
  const topbarCtas =
    (topbarData && topbarData.topbarCtas) || getFallbackTopbarCtas();
  const newestVideos =
    (newestVideosData &&
      newestVideosData.newestVideos &&
      newestVideosData.newestVideos.nodes) ||
    [];
  const curatedTrendingPosts = orderPostsByIds(
    curatedTrendingData &&
      curatedTrendingData.curatedTrendingPosts &&
      curatedTrendingData.curatedTrendingPosts.nodes,
    siteContent.trendingPostIds
  );
  const featuredVideos = curatedTrendingPosts;
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
          spotLightPosts={spotLightPosts}
          featuredVideos={featuredVideos}
          newestVideos={newestVideos}
          trendingNowLoading={newestVideosLoading}
          trendingNowError={newestVideosError}
          railPromo={railPromoFromSiteContent(siteContent)}
          spotlightTitle={siteContent.spotlightTitle}
        >
          {children}
          {showBottomNav && (
            // "more from" rail: WP BottomNav menu (or CMS footerLinks fallback).
            // Not the site Footer menu — that is only for <Footer /> below.
            <BottomNav title="more from" links={siteContent.footerLinks} />
          )}
        </ProgramViewer>
        <Footer
          footer={footer}
          social={social}
          // Site footer only: WordPress Appearance → Menus → Footer.
          links={DEFAULT_FOOTER_MENU_LINKS}
        />
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
