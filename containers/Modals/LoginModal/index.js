import React from "react";
import { Modal, Button } from "react-bootstrap";
import { Link } from "next/link";
import { FaGoogle, FaFacebook } from "react-icons/fa";

import {
  closeOverlayAction,
  openOverlayAction
} from "../../../store/actions/pageActions";
import {
  loginAction,
  registerAction,
  loginThirdPartyAction
} from "../../../store/actions/accountActions";

import { getSocialMenuObject } from "../../../lib/getFunctions";
import SocialLoginButton from "../../../components/SocialLoginButton";
import SocialLinks from "../../../components/SocialLinks";
import SignUpForm from "../../../components/Forms/SignUpForm";
import RegisterForm from "../../../components/Forms/RegisterForm";

const logo = "/static/assets/blue_hec.png";

export default props => {
  const {
    fbAppId,
    googleOauth2ClientId,
    social,
    openOverlay,
    pageForm: { user: { values } = {} } = {},
    dispatch
  } = props;

  const closeOverlay = () => {
    dispatch(closeOverlayAction());
  };

  const changeOverlay = newOverlay => {
    dispatch(openOverlayAction(newOverlay));
  };

  const signinFunc = () => {
    dispatch(loginAction(values));
  };

  const registerFunc = () => {
    dispatch(registerAction(values));
  };

  const thirdPartySigninFunc = data => {
    dispatch(loginThirdPartyAction(data));
  };

  const failedLogin = () => {};

  const logout = () => {};

  const socialLinks = getSocialMenuObject(social, 25, "#002dc4");

  const getSigninButtons = () => (
    <ul>
      <li>
        <SocialLoginButton
          provider="google"
          appId={googleOauth2ClientId}
          onLoginSuccess={thirdPartySigninFunc}
          onLoginFailure={failedLogin}
          onLogoutSuccess={logout}
          width="100%"
          className="social-button"
          style={{ backgroundColor: "rgb(190, 38, 18)" }}
        >
          <FaGoogle size="20" color="white" />
        </SocialLoginButton>
      </li>
      <li>
        <SocialLoginButton
          provider="facebook"
          appId={fbAppId}
          onLoginSuccess={thirdPartySigninFunc}
          onLoginFailure={failedLogin}
          onLogoutSuccess={logout}
          width="100%"
          className="social-button "
          style={{ backgroundColor: "rgb(66, 103, 178)" }}
        >
          <FaFacebook size="20" color="white" />
        </SocialLoginButton>
      </li>
    </ul>
  );

  const getSigninContent = () => (
    <>
      <div className="row text-center">
        <div className="heading" style={{ color: "#555" }}>
          Welcome back!
        </div>
      </div>
      <div className="row text-center padded connect-text">
        Connect now using
      </div>
      <div className="row signup-buttons text-center">{getSigninButtons()}</div>
      <div className="row text-center padded connect-text">Or</div>
      <div className="row">
        <div className="col-md-8 col-md-offset-2 no-padding">
          <SignUpForm callbackFunc={signinFunc} />

          <div className="col-md-12">
            <div className="row">
              <div className="col-md-12 register-option">
                <Button onClick={() => changeOverlay("register")}>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: "Don't have a HEC Media Account?"
                    }}
                  />
                  <span className="blue-text"> Create one now</span>
                </Button>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12 tos">
                By creating an account, you acknowledge that HEC Media may share
                your information with our member stations and our respective
                service providers, and that you have read and understand the{" "}
                <Link to="/terms-of-use">Terms of Use</Link>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const getRegisterContent = () => (
    <>
      <div className="row text-center">
        <div className="heading" style={{ color: "#555" }}>
          Create your account
        </div>
      </div>
      <div className="row text-center padded connect-text">
        Connect your Facebook or Google+ account
      </div>
      <div className="row signup-buttons text-center">{getSigninButtons()}</div>
      <div className="row text-center padded connect-text">Or</div>
      <div className="row">
        <div className="col-md-8 col-md-offset-2 no-padding">
          <RegisterForm callbackFunc={registerFunc} />
          <div className="col-md-12">
            <div className="row">
              <div className="col-md-12 register-option text-center">
                <Button onClick={() => changeOverlay("signin")}>
                  Have an HEC Media Account?
                  <span className="blue-text"> Sign in</span>
                </Button>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12 tos">
                By creating an account, you acknowledge that HEC Media may share
                your information with our member stations and our respective
                service providers, and that you have read and understand the{" "}
                <Link to="/terms-of-use">Terms of Use</Link>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const getContent = () => {
    switch (openOverlay) {
      case "signin":
        return getSigninContent();
      case "register":
        return getRegisterContent();
      default:
        return "";
    }
  };

  return (
    <Modal
      show={openOverlay === "signin" || openOverlay === "register"}
      onHide={closeOverlay}
      aria-labelledby="page-modal"
      className="page-modal login-modal"
    >
      <Modal.Header
        closeButton
        className="modal-header"
        style={{ height: "auto" }}
      >
        <Modal.Title id="modal-header" />
      </Modal.Header>
      <Modal.Body style={{ padding: "0" }}>
        <div className="signin-logo-container">
          <div className="row signin-logo">
            <img
              src={logo}
              alt="logo"
              style={{ margin: "auto" }}
              className="img-responsive"
            />
            <div className="link-container">
              <SocialLinks links={socialLinks} />
            </div>
          </div>
        </div>
        {getContent()};
      </Modal.Body>
    </Modal>
  );
};
