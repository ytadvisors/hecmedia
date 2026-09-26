import fetch from "isomorphic-unfetch";
import {
  GET_CATEGORY_INFO,
  GET_LAYOUT,
  GET_PAGE_INFO
} from "../../../lib/graphql";
import { getPostImgSrc } from "../../../lib/getFunctions";
import {
  getWordPressMediaFallbackUrl,
  rewritePublicMediaHtml
} from "../../../lib/mediaUrl";
import { executeQuery } from "../support/graphqlClient";

const describeMediaAssets =
  process.env.HECMEDIA_E2E_MEDIA_ASSETS === "true" ? describe : describe.skip;

const wait = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const MAX_PROBE_ATTEMPTS = 5;

const probeImage = async ({ title, url }, attempt = 1) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" }
    });
    const contentType = response.headers.get("content-type") || "";
    await response.buffer();

    if (
      attempt < MAX_PROBE_ATTEMPTS &&
      (response.status === 429 || response.status >= 500)
    ) {
      await wait(attempt * 500);
      return probeImage({ title, url }, attempt + 1);
    }

    return {
      title,
      url,
      status: response.status,
      contentType,
      ok: response.ok && contentType.startsWith("image/")
    };
  } catch (error) {
    if (attempt < MAX_PROBE_ATTEMPTS) {
      await wait(attempt * 500);
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

const extractRemoteImageCandidates = html => {
  const candidates = [];
  const imagePattern = /<img\b[^>]*>/gi;
  const content = String(html || "");
  let image = imagePattern.exec(content);

  while (image) {
    const imageAttributePattern = /\b(src|srcset)=["']([^"']+)["']/gi;
    let attribute = imageAttributePattern.exec(image[0]);
    while (attribute) {
      const rawValue = attribute[2].replace(/&amp;/g, "&");
      const values =
        attribute[1].toLowerCase() === "srcset"
          ? rawValue.split(",").map(value => value.trim().split(/\s+/)[0])
          : [rawValue.trim()];
      values.forEach(url => {
        if (/^https?:\/\//i.test(url) && !candidates.includes(url)) {
          candidates.push(url);
        }
      });
      attribute = imageAttributePattern.exec(image[0]);
    }
    image = imagePattern.exec(content);
  }

  return candidates;
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

    const spotlightNodes =
      layoutResult.data &&
      layoutResult.data.spotLight &&
      layoutResult.data.spotLight.nodes;
    const categoryEdges =
      categoryResult.data &&
      categoryResult.data.postData &&
      categoryResult.data.postData.edges;
    expect(Array.isArray(spotlightNodes)).toBe(true);
    expect(Array.isArray(categoryEdges)).toBe(true);

    const spotlight = (spotlightNodes || []).slice(0, 5).map(post => ({
      title: `Spotlight: ${post.title}`,
      url: getPostImgSrc(post)
    }));
    const category = (categoryEdges || [])
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
    const publicArchiveCandidates = uniqueCandidates.filter(candidate =>
      /^https:\/\/prd-hectv-wp-media\.s3\.us-east-2\.amazonaws\.com\/wp-content\/uploads\//i.test(
        candidate.url
      )
    );
    expect(publicArchiveCandidates.length).toBeGreaterThan(0);
    publicArchiveCandidates.forEach(candidate => {
      expect(getWordPressMediaFallbackUrl(candidate.url)).toMatch(
        /^https:\/\/prod-wp\.hectv\.org\/wp-content\/uploads\//i
      );
    });

    // Avoid a burst of parallel range requests masking a persistent asset
    // failure with a transient connection reset from the media origin.
    const results = await probeImagesSequentially(uniqueCandidates);
    const failures = results.filter(result => !result.ok);

    expect(failures).toEqual([]);
  }, 90000);

  it("resolves every inline banner on the HEC on YouTube article", async () => {
    const result = await executeQuery(GET_PAGE_INFO, {
      slug: "hec-on-youtube"
    });

    expect(result.errors).toBeUndefined();
    const post = result.data && result.data.post;
    expect(post).toBeTruthy();

    const rewrittenContent = rewritePublicMediaHtml(post ? post.content : "");
    const urls = extractRemoteImageCandidates(rewrittenContent);

    expect(urls.length).toBeGreaterThanOrEqual(1);
    expect(
      urls.filter(url =>
        /https?:\/\/(?:staging-wp|prod-wp|prod-wp-ecs)\.hectv\.org\/wp-content\/uploads\//i.test(
          url
        )
      )
    ).toEqual([]);

    const candidates = urls.map((url, index) => ({
      title: `HEC on YouTube banner ${index + 1}`,
      url
    }));
    const results = await probeImagesSequentially(candidates);
    const failures = results.filter(image => !image.ok);

    expect(failures).toEqual([]);
  }, 90000);
});
