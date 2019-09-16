import React from "react";
import NewsLetterForm from "../Forms/NewsLetterForm";
import "./styles.scss";

export default ({ subscribe }) => (
  <section className="newsletter">
    <NewsLetterForm callbackFunc={subscribe} />
  </section>
);
