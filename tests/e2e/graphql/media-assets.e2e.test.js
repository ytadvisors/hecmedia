import fetch from "isomorphic-unfetch";
import { GET_CATEGORY_INFO, GET_LAYOUT } from "../../../lib/graphql";
import { getPostImgSrc } from "../../../lib/getFunctions";
import { executeQuery } from "../support/graphqlClient";

const describeMediaAssets =
  process.env.HECMEDIA_E2E_MEDIA_ASSETS === "true" ? describe : describe.skip;

const wait = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const probeImage = async ({ title, url }, attempt = 1) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" }
    });
    const contentType = response.headers.get("content-type") || "";
    await response.buffer();

    return {
      title,
      url,
      status: response.status,
      contentType,
      ok: response.ok && contentType.startsWith("image/")
    };
  } catch (error) {
    if (attempt < 3) {
      await wait(attempt * 200);
      return probeImage({ title, url }, attempt + 1);
    }

    return {
      title,
      url,
      status: 0,
      contentType: "",
      ok: false,
      error: error.message
    };
  }
};

const probeImagesSequentially = async (candidates, results = []) => {
  if (candidates.length === 0) return results;

  const [candidate, ...remaining] = candidates;
  const result = await probeImage(candidate);
  return probeImagesSequentially(remaining, [...results, result]);
};

describeMediaAssets("Production media assets", () => {
  it("resolves the Spotlight rail and Two on the Aisle card thumbnails", async () => {
    const [layoutResult, categoryResult] = await Promise.all([
      executeQuery(GET_LAYOUT),
      executeQuery(GET_CATEGORY_INFO, {
        category: "two_on_the_aisle",
        cursor: ""
      })
    ]);

    expect(layoutResult.errors).toBeUndefined();
    expect(categoryResult.errors).toBeUndefined();

    const spotlight = (layoutResult.data.spotLight.nodes || [])
      .slice(0, 5)
      .map(post => ({
        title: `Spotlight: ${post.title}`,
        url: getPostImgSrc(post)
      }));
    const category = (categoryResult.data.postData.edges || [])
      .slice(0, 10)
      .map(({ node: post }) => ({
        title: `Two on the Aisle: ${post.title}`,
        url: getPostImgSrc(post, "small")
      }));
    const candidates = [...spotlight, ...category].filter(
      candidate => candidate.url
    );
    const uniqueCandidates = candidates.filter(
      (candidate, index) =>
        candidates.findIndex(item => item.url === candidate.url) === index
    );

    expect(uniqueCandidates.length).toBeGreaterThanOrEqual(5);

    // Avoid a burst of parallel range requests masking a persistent asset
    // failure with a transient connection reset from the media origin.
    const results = await probeImagesSequentially(uniqueCandidates);
    const failures = results.filter(result => !result.ok);

    expect(failures).toEqual([]);
  }, 30000);
});
