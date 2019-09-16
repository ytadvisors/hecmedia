import React from "react";
import "./styles.scss";

export default ({
  input,
  label,
  type,
  disabled,
  displayLabel,
  displayErrors,
  rows,
  meta: { asyncValidating, touched, error }
}) => (
  <div className="default-text-area">
    <div className={asyncValidating ? "async-validating" : ""}>
      {displayLabel ? <div className="label">{label}</div> : ""}
      <textarea
        {...input}
        placeholder={label}
        type={type}
        rows={rows}
        disabled={!!disabled}
      />
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
  </div>
);
