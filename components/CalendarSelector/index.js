import React, { Component } from "react";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";

export default class CalendarSelector extends Component {
  constructor(props) {
    super(props);
    const { currentDate = new Date() } = props;
    this.state = {
      startDate: currentDate
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
        dateFormat="MMMM dd"
        onChange={this.handleChange}
      />
    );
  }
}

CalendarSelector.propTypes = {
  callback: PropTypes.func.isRequired
};
