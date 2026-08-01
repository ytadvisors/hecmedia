import { mapPost } from "./postSagas";

describe("mapPost", () => {
  it("rewrites staging upload URLs inside REST-rendered article HTML", () => {
    const mapped = mapPost({
      slug: "staging-media",
      title: { rendered: "Staging media" },
      content: {
        rendered:
          '<p><img src="https://staging-wp.hectv.org/wp-content/uploads/2026/07/rest-article.jpg"></p>'
      },
      categoryList: []
    });

    expect(mapped.content).toContain(
      'src="https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/rest-article.jpg"'
    );
    expect(mapped.content).not.toContain("staging-wp.hectv.org");
  });
});
