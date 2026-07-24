import { GRAPHQL_URI, REST_HOST } from "./support/config";
import {
  isProductionHost,
  isStagingHost,
  writesAllowed
} from "./support/writeGuard";

describe("write safety gate", () => {
  const originalAllowWrites = process.env.E2E_ALLOW_WRITES;

  afterEach(() => {
    if (originalAllowWrites === undefined) delete process.env.E2E_ALLOW_WRITES;
    else process.env.E2E_ALLOW_WRITES = originalAllowWrites;
  });

  it("keeps production endpoints read-only even with the write opt-in", () => {
    process.env.E2E_ALLOW_WRITES = "1";
    const productionGraphql = "https://prod-wp.hectv.org/graphql";
    const productionRest = "https://prod-wp.hectv.org";

    expect(isProductionHost(productionGraphql)).toBe(true);
    expect(isProductionHost(productionRest)).toBe(true);
    expect(writesAllowed(productionGraphql, productionRest)).toBe(false);
  });

  it("keeps configured endpoints read-only without the write opt-in", () => {
    delete process.env.E2E_ALLOW_WRITES;
    expect(writesAllowed(GRAPHQL_URI, REST_HOST)).toBe(false);
  });

  it("requires both the explicit opt-in and a staging-shaped target", () => {
    const staging = "https://staging.hecmedia.org/graphql";

    delete process.env.E2E_ALLOW_WRITES;
    expect(writesAllowed(staging)).toBe(false);

    process.env.E2E_ALLOW_WRITES = "1";
    expect(isStagingHost(staging)).toBe(true);
    expect(writesAllowed(staging)).toBe(true);
    expect(writesAllowed("https://unknown.example.org/graphql")).toBe(false);
  });
});
