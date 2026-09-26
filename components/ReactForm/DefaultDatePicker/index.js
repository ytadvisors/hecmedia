import React, { Component } from "react";
import DatePicker from "react-datepicker";

export default class DefaultDatePicker extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: undefined
    };
  }

  handleDateChange = date => {
    const {
      input: { name },
      change
    } = this.props;
    this.setState({
      startDate: date
    });

    change(name, date.format("MM/DD/YYYY"));
  };

  render() {
    const {
      label,
      displayErrors,
      meta: { touched, error }
    } = this.props;
    const { startDate } = this.state;
    return (
      <div className="date-picker">
        <DatePicker
          dateFormat="MM/DD/YYYY"
          name={label}
          selected={startDate}
          onChange={this.handleDateChange}
          placeholderText={label}
        />
        {displayErrors && (
          <div
            className="errors"
            dangerouslySetInnerHTML={{
              __html: touched && error ? error : "&nbsp;"
            }}
          />
        )}
      </div>
    );
  }
}
