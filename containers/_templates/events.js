import React from "react";
import SEO from "../../components/SEO";
import Layout from "../Layout";
import EventNav from "../../components/SubNavigation/EventNav";
import { getExcerpt } from "../../lib/getFunctions";

const Events = props => {
  const {
    currentCategory = "All",
    currentDate = "",
    title = "Events",
    link = "/events",
    content
  } = props || {};

  const mDay = currentDate ? new Date(`${currentDate}T00:00:01`) : new Date();
  const description =
    content || "On Demand Arts, Culture & Education Programming";
  return (
    <>
      <SEO
        {...{
          title: `HEC-TV | ${title}`,
          image: "",
          description: getExcerpt(description, 320),
          url: process.env.SITE_HOST,
          fbAppId: process.env.FACEBOOK_APP_ID,
          pathname: link && link.replace(/https?:\/\/[^/]+/, "")
        }}
      />
      <Layout>
        <div className="col-md-12">
          <EventNav
            link="/events"
            currentDate={mDay}
            currentCategory={currentCategory}
            selectTitle="Filter Events"
            title="Events"
          />
        </div>
        <div className="col-md-12">
          <p>No Events to display.</p>
        </div>
      </Layout>
    </>
  );
};

export default Events;
