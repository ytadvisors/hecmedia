import React, { useEffect } from "react";
import Recaptcha from "react-recaptcha";
import { loadRecaptchaScript } from "../../../lib/loadRecaptcha";

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

  const callback = () => {};
  const captchaSiteKey = process.env.RE_CAPTCHA_SITE_KEY;

  useEffect(() => {
    if (captchaSiteKey) loadRecaptchaScript();
  }, [captchaSiteKey]);

  return (
    <div className="captcha">
      {captchaSiteKey ? (
        <Recaptcha
          sitekey={captchaSiteKey}
          render="explicit"
          verifyCallback={() => verifyCallback()}
          onloadCallback={callback}
          elementID={name}
        />
      ) : null}
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
