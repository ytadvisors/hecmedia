import React, { Component } from "react";
import { Field } from "redux-form";
import { Button } from "react-bootstrap";
import { FaPlusCircle } from "react-icons/fa";
import _ from "lodash";
import DefaultInput from "../DefaultInput";
import DefaultDatePicker from "../DefaultDatePicker";
import "./styles.scss";

export default class DateTimeAdder extends Component {
  constructor(props) {
    super(props);
    this.state = {
      numRows: 1
    };
  }

  addField = () => {
    const { numRows } = this.state;
    if (numRows < 5) {
      this.setState({ numRows: numRows + 1 });
    }
  };

  render() {
    const {
      labels: { dateLabel, timeLabel, label },
      input: { name },
      displayLabel,
      change
    } = this.props;
    const { numRows } = this.state;

    return (
      <div className="date-time-adder">
        <label htmlFor={name}>{label}</label>
        <div className="date-time-list">
          {displayLabel ? <div className="label">{label}</div> : ""}

          {_.range(numRows).map(key => (
            <div key={`picker-${key}`} className={`row row-num-${key}`}>
              <div className="col-md-5 no-padding">
                <div className="date-picker">
                  <Field
                    name={`date_${key + 1}`}
                    component={DefaultDatePicker}
                    type="text"
                    label={dateLabel}
                    change={change}
                  />
                </div>
              </div>
              <div className="col-md-5">
                <Field
                  name={`time_${key + 1}`}
                  component={DefaultInput}
                  type="text"
                  label={timeLabel}
                />
              </div>
              <div className="col-md-2 no-padding">
                {key === numRows - 1 ? (
                  <Button onClick={this.addField} className="add-btn">
                    <span> ADD </span>
                    <FaPlusCircle size="20" color="green" />
                  </Button>
                ) : (
                  ""
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
