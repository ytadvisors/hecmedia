import React from "react";

export default ({
  active,
  activeKey,
  activeHref,
  onSelect,
  children,
  ...otherProps
}) => (
  <li role="presentation" {...otherProps}>
    {children}
  </li>
);
