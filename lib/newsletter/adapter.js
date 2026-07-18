// Contract every newsletter ESP adapter must satisfy. `subscribe` resolves
// with { ok: true, id } on success or { ok: false, error } on a handled
// rejection (invalid email, duplicate, ESP outage) — it never throws for
// expected ESP responses, only for programmer error (missing config).
//
// subscribe(payload) => Promise<{ ok: boolean, id?: string, error?: string }>
// payload shape: { email, firstName, lastName, consent, source }

class UnavailableNewsletterAdapter {
  constructor() {
    this.name = "unavailable";
    this.isAvailable = false;
    this.error = "Newsletter signup is not available at this time.";
  }

  async subscribe() {
    return {
      ok: false,
      error: this.error
    };
  }
}

let unavailableInstance;

// No durable submission adapter has been provisioned yet. Returning a
// non-success result is intentional: a process-local mock must never tell a
// visitor that a subscription was saved. A future ESP or review-queue adapter
// must set isAvailable=true and preserve this result contract.
export function getNewsletterAdapter() {
  unavailableInstance =
    unavailableInstance || new UnavailableNewsletterAdapter();
  return unavailableInstance;
}

export function resetNewsletterAdapterForTests() {
  unavailableInstance = undefined;
}

export { UnavailableNewsletterAdapter };
