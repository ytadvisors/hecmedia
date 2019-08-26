import React, { Component } from "react";
import moment from "moment";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";
import "./styles.scss";

export default class CalendarSelector extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: moment(new Date())
    };
  }

  handleChange = date => {
    const { callback } = this.props;
    this.setState({
      startDate: date
    });

    callback(date);
  };

  render() {
    const { startDate } = this.state;
    return (
      <DatePicker
        selected={startDate}
        dateFormat="MMMM DD"
        onChange={this.handleChange}
      />
    );
  }
}

CalendarSelector.propTypes = {
  callback: PropTypes.func.isRequired
};
