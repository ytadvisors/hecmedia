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
      <section className="newsletter-page newsletter-thank-you">
        <h1>Thank You</h1>
        <p>
          Check your inbox and confirm your email address to complete your HEC
          Media subscription. If you&rsquo;re already subscribed, there&rsquo;s
          nothing else to do.
        </p>
        <a href="/">Return to the HEC Media home page</a>
      </section>
    </Layout>
  </>
);
