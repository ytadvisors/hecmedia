import React from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";

import "../../node_modules/react-datepicker/dist/react-datepicker.css";
import "./styles.scss";
import ProgramViewer from "../../components/ProgramViewer";
import Header from "../../components/Header";
import Banner from "../../components/Banner";
import Footer from "../../components/Footer";
import BottomNav from "../../components/BottomNav/index";

const Layout = props => {
  const router = useRouter();

  const searchFunc = () => {
    const { pageForm: { search: { values } = {} } = {} } = props;

    if (values && values.search) {
      router.pushRoute(`/search/?q=${values.search}`);
    }
  };

  const { children, showBottomNav, absContent, style } = props;

  return (
    <div className="layout">
      {absContent}
      <Header searchFunc={searchFunc} />
      <Banner liveVideos={[]} />
      <ProgramViewer style={style} programs={[]}>
        {children}
        {showBottomNav && <BottomNav title="more from" />}
      </ProgramViewer>
      <Footer />
    </div>
  );
};

const mapStateToProps = state => ({
  pageForm: state.form,
  post: state.postReducers.post,
  liveVideos: state.postReducers.liveVideos,
  categoryPosts: state.postReducers.categoryPosts
});

export default connect(mapStateToProps)(Layout);
