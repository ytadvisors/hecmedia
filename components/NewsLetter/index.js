import React from "react";
import NewsLetterForm from "../Forms/NewsLetterForm";

export default ({ subscribe }) => (
  <section className="newsletter">
    <NewsLetterForm callbackFunc={subscribe} />
  </section>
);
