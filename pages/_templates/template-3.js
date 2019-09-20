import React from "react";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import Template3 from "../../components/Templates/template-3/index";
import Map from "../../components/Map";

const contactUs = () => {};

export default props => {
  const { title, link, pageContent } = props;
  const { GOOGLE_API_KEY } = process.env;

  return (
    <>
      <div className="col-md-12">
        <DefaultNav title={title} link={link} />
      </div>
      <Template3 {...{ ...pageContent, callbackFunc: contactUs }}>
        <Map mapKey={GOOGLE_API_KEY} />
      </Template3>
    </>
  );
};
