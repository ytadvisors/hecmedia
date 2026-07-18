import React, { useState } from "react";
import PropTypes from "prop-types";
import validator from "validator";
import Recaptcha from "react-recaptcha";
import "./styles.scss";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error"
};

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
export default function NewsletterSignupForm({ onSubscribe, captchaSiteKey }) {
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

  const captchaAvailable = Boolean(captchaSiteKey);

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
    if (!captchaToken) {
      setStatus(STATUS.ERROR);
      setServerError("Please complete spam verification.");
      return;
    }

    setStatus(STATUS.LOADING);
    setServerError(null);

    try {
      const result = await onSubscribe({ ...values, captchaToken });
      if (result && result.ok) {
        setStatus(STATUS.SUCCESS);
      } else {
        setStatus(STATUS.ERROR);
        setServerError((result && result.error) || "Something went wrong.");
      }
    } catch (err) {
      setStatus(STATUS.ERROR);
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (status === STATUS.SUCCESS) {
    return (
      <div className="newsletter-signup-form" data-testid="newsletter-success">
        <p className="success-message">
          You&rsquo;re subscribed! Thanks for signing up for HEC Media updates.
        </p>
      </div>
    );
  }

  const isLoading = status === STATUS.LOADING;

  return (
    <form className="newsletter-signup-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="newsletter-first-name">First name</label>
        <input
          id="newsletter-first-name"
          type="text"
          value={values.firstName}
          onChange={handleChange("firstName")}
          disabled={isLoading}
        />
        {errors.firstName && (
          <div className="field-error">{errors.firstName}</div>
        )}
      </div>

      <div className="field">
        <label htmlFor="newsletter-last-name">Last name</label>
        <input
          id="newsletter-last-name"
          type="text"
          value={values.lastName}
          onChange={handleChange("lastName")}
          disabled={isLoading}
        />
        {errors.lastName && (
          <div className="field-error">{errors.lastName}</div>
        )}
      </div>

      <div className="field">
        <label htmlFor="newsletter-email">Email</label>
        <input
          id="newsletter-email"
          type="email"
          value={values.email}
          onChange={handleChange("email")}
          disabled={isLoading}
        />
        {errors.email && <div className="field-error">{errors.email}</div>}
      </div>

      <div className="field consent">
        <label htmlFor="newsletter-consent">
          <input
            id="newsletter-consent"
            type="checkbox"
            checked={values.consent}
            onChange={handleChange("consent")}
            disabled={isLoading}
          />
          I agree to receive email updates from HEC Media.
        </label>
        {errors.consent && <div className="field-error">{errors.consent}</div>}
      </div>

      {captchaAvailable ? (
        <div className="field captcha-slot" data-testid="captcha-slot">
          <Recaptcha
            sitekey={captchaSiteKey}
            verifyCallback={setCaptchaToken}
            expiredCallback={() => setCaptchaToken(null)}
          />
        </div>
      ) : (
        <div className="captcha-unavailable" data-testid="captcha-unavailable">
          Spam verification is unavailable. Newsletter signup cannot be
          completed right now.
        </div>
      )}

      {status === STATUS.ERROR && (
        <div className="form-error" role="alert" data-testid="form-error">
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
  captchaSiteKey: PropTypes.string
};

NewsletterSignupForm.defaultProps = {
  captchaSiteKey: undefined
};
