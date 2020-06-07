import React, { useState } from "react";
import { connect } from "react-redux";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { Router } from "../../routes";
import { GET_LAYOUT, GET_SCHEDULE, GET_LIVE_VIDEOS } from "../../lib/graphql";
import "./styles.scss";
import ProgramViewer from "../../components/ProgramViewer";
import Header from "../../components/Header";
import Banner from "../../components/Banner";
import Footer from "../../components/Footer";
import BottomNav from "../../components/BottomNav/index";
import TagManager from "../../components/TagManager";
import { setPlayingLiveAction } from "../../store/actions/postActions";

import { BasicModal } from "../Modals";

const Layout = props => {
  const { pageForm: { search: { values } = {} } = {}, dispatch } = props;

  const [currentlyPlaying, setPlaying] = useState(false);

  const searchFunc = () => {
    if (values && values.search) {
      Router.pushRoute(`/search/${values.search}`);
    }
  };

  const mDay = moment(new Date());
  const currentMonth = moment(mDay)
    .format("MMMM-YYYY")
    .toLowerCase();

  const currentDate = moment(mDay)
    .format("YYYY-MM-DD HH:mm:ss")
    .toLowerCase();

  const compareStart = currentDate;
  const compareEnd = currentDate;
  const keyStart = "display_date";
  const keyEnd = "end_date";

  const { data } = useQuery(GET_LAYOUT, {
    notifyOnNetworkStatusChange: true
  });

  const { data: schedule } = useQuery(GET_SCHEDULE, {
    variables: { currentMonth },
    notifyOnNetworkStatusChange: true
  });

  const { data: videos } = useQuery(GET_LIVE_VIDEOS, {
    variables: { keyStart, keyEnd, compareStart, compareEnd },
    notifyOnNetworkStatusChange: true
  });

  const {
    header,
    social,
    footer,
    featuredMagazines,
    spotLight: { nodes: spotLightPosts = [] } = {}
  } = data || {};
  const { children, showBottomNav, absContent, style } = props;
  const { programs } = schedule || {};
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
      <TagManager noScript />
      <div className="layout">
        {absContent}
        <Header searchFunc={searchFunc} header={header} social={social} />
        <Banner liveVideo={liveVideo} />
        <ProgramViewer
          style={style}
          programs={programs}
          featuredMagazines={featuredMagazines}
          spotLightPosts={spotLightPosts}
        >
          {children}
          {showBottomNav && <BottomNav title="more from" />}
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
