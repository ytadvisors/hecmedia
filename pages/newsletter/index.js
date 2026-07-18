/* eslint-env browser */
import React from "react";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";
import NewsletterSignupForm from "../../components/NewsletterSignupForm";

async function subscribe(values) {
  const response = await fetch("/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values)
  });
  return response.json();
}

export default () => (
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
        <h1>Stay Connected</h1>
        <p>
          Subscribe to get HEC Media programming updates and event announcements
          in your inbox.
        </p>
        <NewsletterSignupForm
          onSubscribe={subscribe}
          captchaSiteKey={process.env.RE_CAPTCHA_SITE_KEY}
        />
      </section>
    </Layout>
  </>
);
