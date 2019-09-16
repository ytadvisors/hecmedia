import React from "react";
import "./styles.scss";

export default ({
  input,
  label,
  type,
  disabled,
  displayLabel,
  displayErrors,
  meta: { touched, error }
}) => (
  <div className="default-input">
    {displayLabel ? <div className="label">{label}</div> : ""}
    <input {...input} placeholder={label} type={type} disabled={!!disabled} />
    {displayErrors && (
      <div>
        {error && touched ? (
          <div className="errors">{error}</div>
        ) : (
          <div className="no-errors">&nbsp;</div>
        )}
      </div>
    )}
  </div>
);
