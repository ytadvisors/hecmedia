import React, { Component } from "react";
import $ from "jquery";
import { reduxForm, SubmissionError } from "redux-form";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import ReactForm from "../../ReactForm";
import Validator from "../../ReactForm/Validator";

const fields = [
  {
    name: "email",
    component: "input",
    type: "email",
    placeholder: "Email*",
    validation: ["required", "email"]
  },
  {
    name: "password",
    component: "input",
    type: "password",
    placeholder: "Password*",
    validation: ["required"]
  }
];

const validate = Validator(fields);

class LoginForm extends Component {
  componentDidMount() {}

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
      <section className="login-form">
        <ReactContainer
          {...this.props}
          title=""
          fields={fields}
          onSubmit={this.onSubmit}
        />
      </section>
    );
  }
}

LoginForm.propTypes = {
  prevModal: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  callbackFunc: PropTypes.func.isRequired,
  currentStep: PropTypes.number.isRequired
};

const mapStateToProps = state => ({
  values: state.form.user.values
});

const formName = "user";
const ReactContainer = reduxForm({
  form: formName,
  validate
})(ReactForm);

export default connect(mapStateToProps)(LoginForm);
