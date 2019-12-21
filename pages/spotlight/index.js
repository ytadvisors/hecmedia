import React from "react";
import Category from "../../containers/_templates/category";

export default props => {
  const link = `${process.env.WP_HOST}/category/spotlight/`;
  return <Category {...props} category="spotlight" link={link} />;
};
