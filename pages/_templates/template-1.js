import React from "react";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import Template1 from "../../components/Templates/template-1/index";
import { getExcerpt } from "../../lib/getFunctions";

export default props => {
  const { title, link, pageContent } = props || {};
  const { content } = pageContent;
  const description =
    content || "On Demand Arts, Culture & Education Programming";
  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title={title} link={link} />
        </div>
        <Template1 {...pageContent} />
      </Layout>
    </>
  );
};
