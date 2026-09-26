import React from "react";
import ReviewedContent from "../ReviewedContent";

export default ({
  header,
  content,
  subheader = "",
  footer,
  type,
  data,
  style
}) => (
  <section className={`content-block ${type}`} style={style}>
    <article>
      <div className="content-header">
        <div
          className="main-header"
          dangerouslySetInnerHTML={{ __html: header }}
        />
        <div
          className="sub-header"
          dangerouslySetInnerHTML={{ __html: subheader }}
        />
      </div>
      <div>{data}</div>
      <ReviewedContent as="div" className="content-body" content={content} />
      <div
        className="content-footer"
        dangerouslySetInnerHTML={{ __html: footer }}
      />
    </article>
  </section>
);
