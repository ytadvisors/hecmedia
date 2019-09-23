import React from "react";
import Events from "../_templates/events";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";

export default props => (
    <>
      <SEO />
      <Layout>
        <Events {...props} />
      </Layout>
    </>
  );
