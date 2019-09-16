import React from "react";
import SocialLogin from "react-social-login";
import { Button } from "react-bootstrap";
import "./styles.scss";

const SocialButton = ({ children, triggerLogin, triggerLogout, ...props }) => (
  <Button className="btn social-login-button" onClick={triggerLogin} {...props}>
    {children}
  </Button>
);

export default SocialLogin(SocialButton);
