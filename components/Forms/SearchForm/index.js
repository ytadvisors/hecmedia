import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { reduxForm } from "redux-form";
import "./styles.scss";
import Validator from "../../ReactForm/Validator";
import ReactForm from "../../ReactForm";

const fields = [
  {
    name: "search",
    component: "input",
    type: "text",
    placeholder: "Search*",
    validation: ["required"],
    autofocus: true
  }
];

const validate = Validator(fields);

class SearchForm extends Component {
  onSubmit = () => {
    const { callbackFunc } = this.props;
    callbackFunc.call(this);
  };

  render() {
    return (
      <section className="search-form">
        <ReactContainer
          title=""
          fields={fields}
          onSubmit={this.onSubmit}
          displayErrors={false}
          buttons={{}}
        />
      </section>
    );
  }
}

SearchForm.propTypes = {
  callbackFunc: PropTypes.func.isRequired
};

const ReactContainer = reduxForm({
  form: "search",
  validate
})(ReactForm);

const mapStateToProps = state => ({
  values: state.form.search.values
});

export default connect(mapStateToProps)(SearchForm);
