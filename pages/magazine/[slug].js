import React from "react";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import { getExcerpt } from "../../lib/getFunctions";

export default () => {
  const description = "On Demand Arts, Culture & Education Programming";

  return (
    <>
      <SEO
        {...{
          title: "HEC-TV | Magazines",
          image: "",
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: "/magazines"
        }}
      />
      <Layout style={{ background: "#eee" }}>
        <div className="col-md-12" style={{ background: "#eee" }} />
      </Layout>
    </>
  );
};
