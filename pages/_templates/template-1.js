import React from "react";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import Template1 from "../../components/Templates/template-1/index";

export default props => {
  const { title, link, pageContent } = props;
  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title={title} link={link} />
        </div>
        <Template1 {...pageContent} />
      </Layout>
    </>
  );
};
