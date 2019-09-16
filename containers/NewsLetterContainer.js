import React from "react";

import { connect } from "react-redux";
import { openOverlayAction } from "../store/actions/pageActions";
import NewsLetter from "../components/NewsLetter";

const NewsLetterContainer = ({ dispatch }) => {
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
        <p>You successfully subscribed to our newsletter.</p>
      </div>
    </div>
  );

  const getErrorMsg = () => (
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
          <b>Oops!</b>{" "}
        </p>
        <p>We were unable to subscribe you at the time.</p>
      </div>
    </div>
  );

  const subscribe = async val => {
    const values = { ...val };
    try {
      if (values["newsletter-captcha"]) delete values["newsletter-captcha"];
      // await addToMailchimp(values.EMAIL, values);

      dispatch(openOverlayAction("basic", { content: getSuccessMsg() }));
    } catch (err) {
      dispatch(openOverlayAction("basic", { content: getErrorMsg() }));
    }
  };

  return <NewsLetter subscribe={subscribe} />;
};

const mapStateToProps = state => ({
  pageForm: state.form
});

export default connect(mapStateToProps)(NewsLetterContainer);
