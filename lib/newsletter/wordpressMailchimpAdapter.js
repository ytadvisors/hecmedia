import axios from "axios";
import formsAreNoSend from "../noSend";

const UNAVAILABLE_ERROR = "Newsletter signup is not available at this time.";
const SUBSCRIBE_ERROR =
  "We could not start your subscription. Please try again later.";

function normalizeEndpoint(value) {
  if (!value) return "";
  return `${value}`.replace(/\/+$/, "");
}

export function getWordPressNewsletterConfig() {
  const explicitEndpoint = normalizeEndpoint(
    process.env.HECTV_NEWSLETTER_ENDPOINT
  );
  const wpHost = normalizeEndpoint(process.env.WP_HOST);

  return {
    endpoint:
      explicitEndpoint ||
      (wpHost ? `${wpHost}/wp-json/hectv/v1/newsletter/subscribe` : "")
  };
}

class WordPressMailchimpAdapter {
  constructor({ endpoint, httpClient = axios }) {
    this.name = "wordpress-mailchimp";
    this.endpoint = normalizeEndpoint(endpoint);
    this.httpClient = httpClient;
    this.isAvailable = Boolean(this.endpoint && !formsAreNoSend());
  }

  async subscribe(payload) {
    if (!this.isAvailable) {
      return { ok: false, error: UNAVAILABLE_ERROR };
    }

    const body = JSON.stringify(payload);

    try {
      const response = await this.httpClient.post(this.endpoint, body, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 8000
      });
      const data = response && response.data;

      if (data && data.ok === true && data.status === "accepted") {
        return { ok: true, status: "accepted" };
      }

      return { ok: false, error: SUBSCRIBE_ERROR };
    } catch (err) {
      return { ok: false, error: SUBSCRIBE_ERROR };
    }
  }
}

export { SUBSCRIBE_ERROR, WordPressMailchimpAdapter };
