import React, { Component } from "react";
import $ from "jquery";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { reduxForm, SubmissionError } from "redux-form";
import Validator from "../../ReactForm/Validator";
import ReactForm from "../../ReactForm";

import "./styles.scss";
import countries from "../countries.json";

const fields = [
  [
    {
      name: "first_name",
      component: "input",
      type: "text",
      placeholder: "First Name*",
      validation: ["required"]
    },
    {
      name: "last_name",
      component: "input",
      type: "text",
      placeholder: "Last Name*",
      validation: ["required"]
    }
  ],
  [
    {
      name: "email",
      component: "input",
      type: "email",
      placeholder: "Email*",
      validation: ["required", "email"]
    },
    {
      name: "phone",
      component: "input",
      type: "text",
      placeholder: "Phone*",
      validation: ["required", "phone"]
    }
  ],
  [
    {
      name: "school",
      component: "input",
      type: "text",
      placeholder: "School*",
      validation: ["required"]
    }
  ],
  [
    {
      name: "address",
      component: "input",
      type: "text",
      placeholder: "Address*",
      validation: ["required"]
    }
  ],
  [
    {
      name: "city",
      component: "input",
      type: "text",
      placeholder: "City*",
      validation: ["required"]
    },
    {
      name: "state",
      component: "input",
      type: "text",
      placeholder: "State*",
      validation: ["required"]
    },
    {
      name: "zip",
      component: "input",
      type: "text",
      placeholder: "Zip Code*",
      validation: ["required"]
    }
  ],
  [
    {
      name: "country",
      component: "selectMenu",
      type: "text",
      placeholder: "Country*",
      defaultText: "Select a Country",
      options: countries,
      validation: ["required"]
    }
  ],
  [
    {
      name: "message",
      component: "textarea",
      type: "text",
      rows: 8,
      placeholder:
        "Let us know why you're contacting us. If you are uploading curriculum or a video, please let us know the name of the creator, location, subject, and grade level intended for.\n\nExample. 'This video was created by Tommy from Viking Elementary School in Albany, New York. This video is about weather and is intended for grades 3 through 6.'\n\nWe will contact you for any questions.",
      validation: ["required"]
    }
  ],
  [
    {
      name: "contact-captcha",
      component: "captcha",
      type: "text",
      validation: ["required"]
    }
  ]
];

const validate = Validator(fields);

class ContactForm extends Component {
  onSubmit = () => {
    const { callbackFunc, terms } = this.props;
    const validSubmit =
      !terms || (terms && $(".terms-and-conditions").is(":checked"));

    if (!validSubmit) {
      throw new SubmissionError({
        terms: "You must agree to the terms and conditions",
        _error: "You must agree to the terms and conditions"
      });
    }

    callbackFunc.call(this);
  };

  render() {
    return (
      <section className="contact-form">
        <ReactContainer
          title=""
          fields={fields}
          onSubmit={this.onSubmit}
          buttons={{ next: "Submit", next_class: "center_btn" }}
        />
        <div className="row" />
      </section>
    );
  }
}

ContactForm.propTypes = {
  callbackFunc: PropTypes.func.isRequired
};

const ReactContainer = reduxForm({
  form: "contact",
  validate
})(ReactForm);

const mapStateToProps = state => ({
  values: state.form.contact.values
});

export default connect(mapStateToProps)(ContactForm);
