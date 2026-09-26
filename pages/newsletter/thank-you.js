import React from "react";
import Layout from "../../containers/Layout";
import SEO from "../../components/SEO";

export default () => (
  <>
    <SEO
      title="HEC-TV | Newsletter Signup Complete"
      description="Thank you for subscribing to HEC Media email updates."
      url={process.env.SITE_HOST}
      fbAppId={process.env.FACEBOOK_APP_ID}
      pathname="/newsletter/thank-you"
    />
    <Layout>
      <section className="newsletter-page newsletter-thank-you-page">
        <div className="newsletter-thank-you">
          <div className="newsletter-thank-you__icon" aria-hidden="true">
            <span>&#10003;</span>
          </div>
          <span className="newsletter-eyebrow">HEC Media Newsletter</span>
          <h1>Thank You</h1>
          <p className="newsletter-thank-you__lead">
            Check your inbox and confirm your email address to complete your HEC
            Media subscription. If you&rsquo;re already subscribed,
            there&rsquo;s nothing else to do.
          </p>
          <a className="newsletter-home-link" href="/">
            Return to the HEC Media home page
          </a>
        </div>
      </section>
    </Layout>
  </>
);
