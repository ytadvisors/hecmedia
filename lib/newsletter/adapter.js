import formsAreNoSend from "../noSend";
import {
  getWordPressNewsletterConfig,
  WordPressMailchimpAdapter
} from "./wordpressMailchimpAdapter";

const UNAVAILABLE_ERROR = "Newsletter signup is not available at this time.";

class UnavailableNewsletterAdapter {
  constructor() {
    this.name = "unavailable";
    this.isAvailable = false;
    this.error = UNAVAILABLE_ERROR;
  }

  async subscribe() {
    return {
      ok: false,
      error: this.error
    };
  }
}

let adapterInstance;

export function getNewsletterAdapter() {
  if (adapterInstance) return adapterInstance;

  if (formsAreNoSend()) {
    adapterInstance = new UnavailableNewsletterAdapter();
    return adapterInstance;
  }

  const config = getWordPressNewsletterConfig();
  const candidate = new WordPressMailchimpAdapter(config);
  adapterInstance = candidate.isAvailable
    ? candidate
    : new UnavailableNewsletterAdapter();
  return adapterInstance;
}

export function resetNewsletterAdapterForTests() {
  adapterInstance = undefined;
}

export {
  UnavailableNewsletterAdapter,
  getWordPressNewsletterConfig,
  WordPressMailchimpAdapter
};
export { SUBSCRIBE_ERROR } from "./wordpressMailchimpAdapter";
