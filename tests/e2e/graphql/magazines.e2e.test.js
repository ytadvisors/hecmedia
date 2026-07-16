import { GET_ALL_MAGAZINES, GET_MAGAZINE_INFO } from "../../../lib/graphql";
import { executeQuery } from "../support/graphqlClient";

describe("MagazineList (containers/_templates/magazines.js)", () => {
  it("returns a paginated magazine list plus feed design for the magazines index", async () => {
    const result = await executeQuery(GET_ALL_MAGAZINES, { cursor: "" });

    expect(result.errors).toBeUndefined();
    const { magazineData, pageData } = result.data;

    expect(Array.isArray(magazineData.edges)).toBe(true);
    magazineData.edges.forEach(({ node }) => {
      expect(typeof node.magazineId).toBe("number");
      expect(typeof node.slug).toBe("string");
      expect(typeof node.title).toBe("string");
      expect(typeof node.link).toBe("string");
    });
    if (pageData !== null) {
      expect(
        pageData.feedDesign === null || typeof pageData.feedDesign === "object"
      ).toBe(true);
    }
  });
});

describe("MagazineInfo (pages/magazine/[slug].js)", () => {
  it("resolves a real magazine slug to its content + related posts", async () => {
    const list = await executeQuery(GET_ALL_MAGAZINES, { cursor: "" });
    const sample = list.data.magazineData.edges[0];
    if (!sample) return; // empty result set is acceptable, see TESTING.md#e2e

    const result = await executeQuery(GET_MAGAZINE_INFO, {
      slug: sample.node.slug
    });

    const { magazine } = result.data;
    expect(magazine).not.toBeNull();
    expect(typeof magazine.magazineId).toBe("number");
    expect(typeof magazine.title).toBe("string");
    expect(
      magazine.magazineDetail === null ||
        typeof magazine.magazineDetail === "object"
    ).toBe(true);
  });
});
