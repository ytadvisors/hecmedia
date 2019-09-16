import React from "react";
import Recaptcha from "react-recaptcha";
import "./styles.scss";

const { RE_CAPTCHA_SITE_KEY } = process.env;

export default props => {
  const {
    input: { name },
    displayErrors,
    meta: { touched, error },
    change
  } = props;

  const verifyCallback = () => {
    change(name, true);
  };

  const callback = () => {
    console.log("Done!!!!");
  };

  return (
    <div className="captcha">
      <Recaptcha
        sitekey={RE_CAPTCHA_SITE_KEY}
        render="explicit"
        verifyCallback={() => verifyCallback()}
        onloadCallback={callback}
        elementID={name}
      />
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
};
