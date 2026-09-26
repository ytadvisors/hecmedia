import React from "react";
import Layout from "../../../containers/Layout";
import SEO from "../../../components/SEO";
import { getExcerpt } from "../../../lib/getFunctions";

export default () => {
  const description = "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title: "HEC-TV | Events",
          image: "",
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: "/events"
        }}
      />
      <Layout>
        <div className="col-md-12" />
      </Layout>
    </>
  );
};
