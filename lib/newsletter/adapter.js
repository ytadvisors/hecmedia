// Contract every newsletter ESP adapter must satisfy. `subscribe` resolves
// with { ok: true, id } on success or { ok: false, error } on a handled
// rejection (invalid email, duplicate, ESP outage) — it never throws for
// expected ESP responses, only for programmer error (missing config).
//
// subscribe(payload) => Promise<{ ok: boolean, id?: string, error?: string }>
// payload shape: { email, firstName, lastName, consent, source }

class MockNewsletterAdapter {
  constructor() {
    this.name = "mock";
    this.sent = [];
  }

  // Records the attempt in-memory and returns a synthetic id. Never opens a
  // network connection — this is the only adapter allowed to run against
  // development.hecmedia.org until a real ESP is chosen and its credentials
  // are provisioned (see docs/newsletter-adapter-contract.md).
  async subscribe(payload) {
    const id = `mock-${this.sent.length + 1}`;
    this.sent.push({ ...payload, id });
    return { ok: true, id };
  }
}

let mockInstance;

// Selects the adapter for the current environment. No real ESP adapter
// exists yet (see docs/newsletter-adapter-contract.md for the interface a
// future one must implement), so this always resolves to the mock adapter
// today. When a real adapter is added, it must still check formsAreNoSend()
// first and fall back to mock — staging must never be able to send.
export function getNewsletterAdapter() {
  mockInstance = mockInstance || new MockNewsletterAdapter();
  return mockInstance;
}

export function resetNewsletterAdapterForTests() {
  mockInstance = undefined;
}

export { MockNewsletterAdapter };
