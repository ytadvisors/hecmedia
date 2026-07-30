import React, { Component } from "react";
import { reduxForm, SubmissionError } from "redux-form";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import $ from "jquery";
import ReactForm from "../../ReactForm";
import Validator from "../../ReactForm/Validator";

const fields = [
  {
    name: "email",
    component: "input",
    type: "text",
    placeholder: "Email or username",
    validation: ["required"]
  },
  {
    name: "firstName",
    component: "input",
    type: "text",
    placeholder: "First Name",
    validation: ["required"]
  },
  {
    name: "lastName",
    component: "input",
    type: "text",
    placeholder: "Last Name",
    validation: ["required"]
  },
  {
    name: "password",
    component: "input",
    type: "password",
    placeholder: "Password",
    validation: ["required"]
  }
];

const validate = Validator(fields);

class RegisterForm extends Component {
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
      <section className="register-form">
        <ReactContainer
          title=""
          fields={fields}
          onSubmit={this.onSubmit}
          buttons={{ next: "Register" }}
        />
      </section>
    );
  }
}

RegisterForm.propTypes = {
  callbackFunc: PropTypes.func.isRequired
};

const ReactContainer = reduxForm({
  form: "user",
  validate
})(ReactForm);

const mapStateToProps = state => ({
  values: state.form.newsletter.values
});

export default connect(mapStateToProps)(RegisterForm);
