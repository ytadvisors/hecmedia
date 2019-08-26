import React from "react";

const { APOLLO_CLIENT_URI } = process.env;

export default () => <div>{APOLLO_CLIENT_URI}</div>;
