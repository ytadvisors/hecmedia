import React from "react";
import { connect } from "react-redux";
import { sendContactEmail } from "../../store/actions/accountActions";
import { openOverlayAction } from "../../store/actions/pageActions";
import SEO from "../../components/SEO";
import Layout from "../../containers/Layout";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import Template3 from "../../components/Templates/template-3/index";
import Map from "../../components/Map";

const getSuccessMsg = () => (
  <div
    className="text-center"
    style={{
      padding: "1.2em 3em 2.8em",
      lineHeight: "2em",
      background: "#ddecff"
    }}
  >
    <div>
      <p>
        <b>Congratulations!</b>{" "}
      </p>
      <p>Your contact message has been sent.</p>
    </div>
  </div>
);

const contactUs = props => {
  const { pageForm: { contact: { values } = {} } = {}, dispatch } = props;
  const newValues = { ...values };
  delete newValues["contact-captcha"];
  dispatch(sendContactEmail(newValues));
  dispatch(openOverlayAction("basic", { content: getSuccessMsg() }));
};

const Page = props => {
  const { title, link, pageContent } = props;
  const { GOOGLE_API_KEY } = process.env;

  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title={title} link={link} />
        </div>

        <Template3
          {...{ ...pageContent, callbackFunc: () => contactUs(props) }}
        >
          <Map mapKey={GOOGLE_API_KEY} />
        </Template3>
      </Layout>
    </>
  );
};

const mapStateToProps = state => ({
  pageForm: state.form
});

export default connect(mapStateToProps)(Page);
