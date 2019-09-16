import React from "react";
import ContentBlock from "../../ContentBlock";
import ContactForm from "../../Forms/ContactForm";
import "./styles.scss";

export default ({
  pageContent: {
    phoneNumber,
    address,
    faxNumber,
    directions,
    opportunities
  } = {},
  children,
  callbackFunc
} = {}) => (
  <section className="template-3">
    <ContactForm callbackFunc={callbackFunc} />
    {children}
    <div className="row info-block">
      <div className="col-md-6">
        <ContentBlock
          header={address}
          subheader={`Phone ${phoneNumber}<br/>Fax ${faxNumber}`}
          content="<strong>WHERE TO FIND US</strong>"
          footer={directions}
          type="blue-block"
          style={{ minHeight: "320px" }}
        />
      </div>
      <div className="col-md-6">
        <ContentBlock
          header="Opportunities"
          content={opportunities}
          type="white-block"
          style={{ minHeight: "320px" }}
        />
      </div>
    </div>
  </section>
);
