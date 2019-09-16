import React, { Component } from "react";
import $ from "jquery";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { reduxForm, SubmissionError } from "redux-form";
import ReactForm from "../../ReactForm";
import Validator from "../../ReactForm/Validator";
import "./styles.scss";

const fields = [
  {
    name: "FNAME",
    component: "input",
    type: "text",
    placeholder: "First Name*",
    validation: ["required"]
  },
  {
    name: "LNAME",
    component: "input",
    type: "text",
    placeholder: "Last Name*",
    validation: ["required"]
  },
  {
    name: "EMAIL",
    component: "input",
    type: "email",
    placeholder: "Email*",
    validation: ["required", "email"]
  },
  [
    {
      name: "newsletter-captcha",
      component: "captcha",
      type: "text",
      validation: ["required"]
    }
  ]
];

const validate = Validator(fields);

class NewsLetterForm extends Component {
  onSubmit = () => {
    const { callbackFunc, terms, values } = this.props;
    const validSubmit =
      !terms || (terms && $(".terms-and-conditions").is(":checked"));

    if (!validSubmit) {
      throw new SubmissionError({
        terms: "You must agree to the terms and conditions",
        _error: "You must agree to the terms and conditions"
      });
    }

    callbackFunc.call(null, values);
  };

  render() {
    return (
      <section className="newsletter-form">
        <ReactContainer
          title=""
          fields={fields}
          onSubmit={this.onSubmit}
          buttons={{ next: "Subscribe" }}
        />
      </section>
    );
  }
}

NewsLetterForm.propTypes = {
  callbackFunc: PropTypes.func.isRequired
};

const ReactContainer = reduxForm({
  form: "newsletter",
  validate
})(ReactForm);

const mapStateToProps = state => ({
  values: state.form.newsletter.values
});

export default connect(mapStateToProps)(NewsLetterForm);
