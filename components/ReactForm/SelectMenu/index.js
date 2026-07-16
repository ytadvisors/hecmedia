import React from "react";
import Select from "react-select";

import "./styles.scss";

export default ({
  label,
  input,
  options,
  meta: { touched, error },
  displayLabel,
  defaultText,
  change
}) => {
  const handleMenuChange = option => change(input.name, option.value);
  return (
    <div className="select-menu">
      {displayLabel ? <div className="label">{label}</div> : ""}
      <Select
        name={input.name}
        options={options}
        placeholder={defaultText}
        onChange={handleMenuChange}
      />
      <div
        className="errors"
        dangerouslySetInnerHTML={{
          __html: touched && error ? error : "&nbsp;"
        }}
      />
    </div>
  );
};
