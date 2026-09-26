import React from "react";
import Content from "../../Content";

export default ({ pageContent = {} }) => (
  <section className="template-2">
    <section className="col-md-12">
      <Content post={pageContent} />
    </section>
  </section>
);
