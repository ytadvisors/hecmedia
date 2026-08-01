import React from "react";
import SEO from "../../components/SEO";
import Layout from "../Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";
import { getExcerpt } from "../../lib/getFunctions";

const Magazines = props => {
  const { title = "", link, content } = props || {};
  const description =
    content || "On Demand Arts, Culture & Education Programming";
  const posts = [];

  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, ""),
          image: ""
        }}
      />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title="Magazines" link="/magazines" />
        </div>
        <ListOfPosts
          posts={posts}
          link={{ page: "magazine" }}
          numResults={0}
          design={undefined}
          loadMore={null}
        />
      </Layout>
    </>
  );
};

export default Magazines;
