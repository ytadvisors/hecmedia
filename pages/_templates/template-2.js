import React from "react";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import SinglePost from "../../components/SinglePost";

export default props => {
  const { title, link } = props;
  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title={title} link={link} />
        </div>
        <div className="col-md-12">
          <SinglePost post={props} hideTitle />
        </div>
      </Layout>
    </>
  );
};
