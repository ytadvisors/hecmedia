import React, { Component } from "react";
import _ from "lodash";

export default class CheckBoxInput extends Component {
  onChange = (event, itemValue) => {
    const { input } = this.props;

    const oldValues = input.value || [];
    let newValues = _.without(oldValues, itemValue); // remove value

    if (event.target.checked) {
      // was checked
      newValues = oldValues.concat(itemValue);
    }
    console.log(newValues);
    input.onChange(newValues);
  };

  render() {
    const {
      input,
      displayErrors,
      meta: { touched, error },
      options
    } = this.props;
    return (
      <div className="checkbox-input">
        {options.map(option => (
          <div className="form-checkbox" key={`checkbox-${option.text}`}>
            <div>
              <input
                type="checkbox"
                checked={input.value.indexOf(option.value) >= 0}
                onChange={e => this.onChange(e, option.value)}
              />
              <label htmlFor={option.text}>{option.text}</label>
            </div>
          </div>
        ))}
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
