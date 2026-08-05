/* eslint-env browser */
import React from "react";
import Router from "next/router";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import NewsletterSignupForm from "../../components/NewsletterSignupForm";
import { isNewsletterLocalTestMode } from "../../lib/newsletter/localTest";

async function subscribe(values) {
  // No-send is enforced at the API/deployment boundary, not here. This keeps
  // the browser's real submit -> response -> redirect path testable while the
  // staging build continues to prevent every durable subscription write.
  const response = await fetch("/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values)
  });
  return response.json();
}

export default () => {
  const localTestMode = isNewsletterLocalTestMode();
  const captchaConfigured = Boolean(process.env.RE_CAPTCHA_SITE_KEY);

  return (
    <>
      <SEO
        title="HEC-TV | Newsletter Signup"
        description="Sign up for HEC Media email updates on new programming and events."
        url={process.env.SITE_HOST}
        fbAppId={process.env.FACEBOOK_APP_ID}
        pathname="/newsletter"
      />
      <Layout>
        <section className="newsletter-page">
          <header className="newsletter-hero">
            <div className="newsletter-hero__copy">
              <span className="newsletter-eyebrow">HEC Media Newsletter</span>
              <h1>Stay Connected</h1>
              <p>
                Stories that educate, inspire, and celebrate St. Louis—delivered
                to your inbox.
              </p>
            </div>
            <div className="newsletter-hero__art" aria-hidden="true">
              <svg viewBox="0 0 480 300" role="presentation">
                <rect x="58" y="48" width="364" height="204" rx="12" />
                <path d="M70 66l170 116L410 66" />
                <path d="M70 236l121-102M410 236L289 134" />
                <circle cx="394" cy="56" r="34" />
                <path
                  className="newsletter-hero__play"
                  d="M385 39l24 17-24 17z"
                />
              </svg>
              <span>HEC</span>
            </div>
          </header>

          <div className="newsletter-intro">
            <p className="newsletter-intro__lead">
              Get a thoughtful selection of HEC Media programs, community
              stories, educational resources, and upcoming events.
            </p>
            <ul aria-label="Newsletter topics">
              <li>Arts &amp; Culture</li>
              <li>Education</li>
              <li>St. Louis Stories</li>
            </ul>
          </div>

          <section
            className="newsletter-signup-panel"
            aria-labelledby="newsletter-signup-title"
          >
            <span className="newsletter-eyebrow">In your inbox</span>
            <h2 id="newsletter-signup-title">Subscribe to HEC Media</h2>
            <p>
              Tell us where to send your updates. After signing up, check your
              inbox to confirm your subscription.
            </p>
            {!captchaConfigured && !localTestMode ? (
              <p
                className="newsletter-unavailable"
                data-testid="newsletter-unavailable"
              >
                Newsletter signup is not available at this time.
              </p>
            ) : (
              <NewsletterSignupForm
                onSubscribe={subscribe}
                captchaSiteKey={process.env.RE_CAPTCHA_SITE_KEY}
                captchaRequired={!localTestMode}
                onSuccess={() => Router.push("/newsletter/thank-you")}
              />
            )}
          </section>

          <p className="newsletter-privacy-note">
            We respect your inbox. Unsubscribe at any time using the link in any
            HEC Media email.
          </p>
        </section>
      </Layout>
    </>
  );
};
