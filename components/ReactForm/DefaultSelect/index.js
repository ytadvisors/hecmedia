import React from "react";
import _ from "lodash";
import { CardElement } from "react-stripe-elements";

export default ({
  input,
  label,
  options,
  meta: { touched, error },
  children,
  displayErrors,
  displayLabel
}) => {
  const selectedOption = _.find(options, { value: input.value });
  return (
    <div className="default-select">
      {displayLabel ? <div className="label">{label}</div> : ""}
      <select {...input}>{children}</select>
      {displayErrors && (
        <div
          className="errors"
          dangerouslySetInnerHTML={{
            __html: touched && error ? error : "&nbsp;"
          }}
        />
      )}
      {selectedOption && selectedOption.info ? (
        <div className="info">{selectedOption.info}</div>
      ) : (
        ""
      )}
      {selectedOption &&
      selectedOption.price &&
      selectedOption.show_card &&
      selectedOption.price !== "0" ? (
        <div className="stripe-card">
          <label htmlFor={input.name}>Card details</label>
          <CardElement
            className="stripe-card"
            style={{
              base: {
                fontSize: "14px"
              }
            }}
          />
        </div>
      ) : (
        ""
      )}
    </div>
  );
};
