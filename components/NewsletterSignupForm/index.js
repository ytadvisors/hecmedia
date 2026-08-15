import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import validator from "validator";
import Recaptcha from "react-recaptcha";
import { loadRecaptchaScript } from "../../lib/loadRecaptcha";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error"
};

// react-recaptcha requires an onload callback before it will render in the
// explicit mode used by the site-wide Google API script.
const handleCaptchaLoad = () => {};

function validate({ firstName, lastName, email, consent }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = "Required";
  if (!lastName.trim()) errors.lastName = "Required";
  if (!email.trim() || !validator.isEmail(email))
    errors.email = "Enter a valid email address";
  if (!consent) errors.consent = "You must agree to receive email updates";
  return errors;
}

// `onSubscribe` is injected by the page so this component stays free of
// fetch/adapter concerns and is testable with a plain jest.fn(). It must
// return a Promise resolving to { ok, error? }.
export default function NewsletterSignupForm({
  onSubscribe,
  captchaSiteKey,
  captchaRequired,
  onSuccess
}) {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    consent: false
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(STATUS.IDLE);
  const [serverError, setServerError] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  const captchaAvailable = Boolean(captchaSiteKey);

  useEffect(() => {
    if (captchaRequired && captchaAvailable) loadRecaptchaScript();
  }, [captchaRequired, captchaAvailable]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    if (captchaRef.current && captchaRef.current.reset) {
      captchaRef.current.reset();
    }
  };

  const handleChange = field => event => {
    const { value, type, checked } = event.target;
    setValues(prev => ({
      ...prev,
      [field]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;
    if (captchaRequired && !captchaToken) {
      setStatus(STATUS.ERROR);
      setServerError("Please complete spam verification.");
      return;
    }

    setStatus(STATUS.LOADING);
    setServerError(null);

    try {
      const result = await onSubscribe({
        ...values,
        ...(captchaRequired ? { captchaToken } : {})
      });
      if (result && result.ok) {
        setStatus(STATUS.SUCCESS);
        onSuccess();
      } else {
        setStatus(STATUS.ERROR);
        setServerError((result && result.error) || "Something went wrong.");
        resetCaptcha();
      }
    } catch (err) {
      setStatus(STATUS.ERROR);
      setServerError("Something went wrong. Please try again.");
      resetCaptcha();
    }
  };

  if (status === STATUS.SUCCESS) {
    return (
      <div className="newsletter-signup-form" data-testid="newsletter-success">
        <p className="success-message">
          Thanks! Check your inbox to confirm your HEC Media subscription.
        </p>
      </div>
    );
  }

  const isLoading = status === STATUS.LOADING;

  return (
    <form className="newsletter-signup-form" onSubmit={handleSubmit} noValidate>
      <div className="field field--first-name">
        <label htmlFor="newsletter-first-name">First name</label>
        <input
          id="newsletter-first-name"
          type="text"
          value={values.firstName}
          onChange={handleChange("firstName")}
          disabled={isLoading}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={
            errors.firstName ? "newsletter-first-name-error" : undefined
          }
        />
        {errors.firstName && (
          <div id="newsletter-first-name-error" className="field-error">
            {errors.firstName}
          </div>
        )}
      </div>

      <div className="field field--last-name">
        <label htmlFor="newsletter-last-name">Last name</label>
        <input
          id="newsletter-last-name"
          type="text"
          value={values.lastName}
          onChange={handleChange("lastName")}
          disabled={isLoading}
          aria-invalid={Boolean(errors.lastName)}
          aria-describedby={
            errors.lastName ? "newsletter-last-name-error" : undefined
          }
        />
        {errors.lastName && (
          <div id="newsletter-last-name-error" className="field-error">
            {errors.lastName}
          </div>
        )}
      </div>

      <div className="field field--email">
        <label htmlFor="newsletter-email">Email</label>
        <input
          id="newsletter-email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          disabled={isLoading}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
        />
        {errors.email && (
          <div id="newsletter-email-error" className="field-error">
            {errors.email}
          </div>
        )}
      </div>

      <div className="field field--wide consent">
        <label htmlFor="newsletter-consent">
          <input
            id="newsletter-consent"
            type="checkbox"
            checked={values.consent}
            onChange={handleChange("consent")}
            disabled={isLoading}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={
              errors.consent ? "newsletter-consent-error" : undefined
            }
          />
          I agree to receive email updates from HEC Media.
        </label>
        {errors.consent && (
          <div id="newsletter-consent-error" className="field-error">
            {errors.consent}
          </div>
        )}
      </div>

      {captchaRequired && captchaAvailable && (
        <div
          className="field field--wide captcha-slot"
          data-testid="captcha-slot"
        >
          <Recaptcha
            ref={captchaRef}
            sitekey={captchaSiteKey}
            render="explicit"
            onloadCallback={handleCaptchaLoad}
            elementID="newsletter-recaptcha"
            verifyCallback={setCaptchaToken}
            expiredCallback={() => setCaptchaToken(null)}
          />
        </div>
      )}

      {captchaRequired && !captchaAvailable && (
        <div
          className="field--wide captcha-unavailable"
          data-testid="captcha-unavailable"
        >
          Spam verification is unavailable. Newsletter signup cannot be
          completed right now.
        </div>
      )}

      {status === STATUS.ERROR && (
        <div
          className="field--wide form-error"
          role="alert"
          data-testid="form-error"
        >
          {serverError}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}

NewsletterSignupForm.propTypes = {
  onSubscribe: PropTypes.func.isRequired,
  captchaSiteKey: PropTypes.string,
  captchaRequired: PropTypes.bool,
  onSuccess: PropTypes.func
};

NewsletterSignupForm.defaultProps = {
  captchaSiteKey: undefined,
  captchaRequired: true,
  onSuccess: () => {}
};
