import React from "react";
import { connect } from "react-redux";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { Router } from "../../routes";
import { GET_LAYOUT, GET_SCHEDULE } from "../../lib/graphql";
import "./styles.scss";
import ProgramViewer from "../../components/ProgramViewer";
import Header from "../../components/Header";
import Banner from "../../components/Banner";
import Footer from "../../components/Footer";
import BottomNav from "../../components/BottomNav/index";

import { BasicModal } from "../Modals";

const Layout = props => {
  const searchFunc = () => {
    const { pageForm: { search: { values } = {} } = {} } = props;
    if (values && values.search) {
      Router.pushRoute(`/search/${values.search}`);
    }
  };

  const mDay = moment(new Date());
  const currentMonth = moment(mDay)
    .format("MMMM-YYYY")
    .toLowerCase();

  const { data } = useQuery(GET_LAYOUT, {
    notifyOnNetworkStatusChange: true
  });

  const { header, social, footer, featuredMagazines } = data || {};
  const { children, showBottomNav, absContent, style } = props;

  const { data: schedule } = useQuery(GET_SCHEDULE, {
    variables: { currentMonth },
    notifyOnNetworkStatusChange: true
  });

  const { programs } = schedule || {};

  return (
    <>
      <div className="layout">
        {absContent}
        <Header searchFunc={searchFunc} header={header} social={social} />
        <Banner liveVideos={[]} />
        <ProgramViewer
          style={style}
          programs={programs}
          featuredMagazines={featuredMagazines}
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
  pageForm: state.form
});

export default connect(mapStateToProps)(Layout);
