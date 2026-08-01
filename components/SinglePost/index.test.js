import React from "react";
import { render } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import SinglePost, { resolveHeaderImageSize } from "./index";
import { GET_POST_HEADER_IMAGE_SIZE } from "../../lib/graphql";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("jquery", () => () => ({
  remove: jest.fn(),
  slick: jest.fn(),
  each: jest.fn(),
  width: jest.fn(() => 1200)
}));

jest.mock("slick-carousel/slick/slick", () => ({}));

const post = {
  slug: "header-image-size-small",
  title: "Article",
  content: "<p>Article body</p>",
  link: "https://hectv.org/posts/header-image-size-small",
  postDetails: {
    postHeader: { large: "https://img.test/header.jpg" }
  }
};

function renderPost(queryResult, postOverrides = {}) {
  useQuery.mockImplementation(query => {
    if (query === GET_POST_HEADER_IMAGE_SIZE) return queryResult;
    return {};
  });
  return render(<SinglePost post={{ ...post, ...postOverrides }} />);
}

describe("resolveHeaderImageSize", () => {
  it.each(["small", "medium", "large", "full"])(
    "preserves the supported %s value",
    value => {
      expect(resolveHeaderImageSize({ post: { headerImageSize: value } })).toBe(
        value
      );
    }
  );

  it.each([undefined, null, "", "unexpected"])(
    "falls back to full for missing or invalid metadata (%s)",
    value => {
      expect(
        resolveHeaderImageSize(
          value === undefined ? undefined : { post: { headerImageSize: value } }
        )
      ).toBe("full");
    }
  );
});

describe("article header image sizing (component)", () => {
  afterEach(() => jest.clearAllMocks());

  it("uses the isolated query value when it is configured", () => {
    const { container } = renderPost({
      data: { post: { headerImageSize: "small" } }
    });

    expect(container.querySelector(".article-header-image")).toHaveAttribute(
      "data-header-image-size",
      "small"
    );
  });

  it("falls back to full width when the optional GraphQL field errors", () => {
    const { container } = renderPost({
      data: undefined,
      error: new Error('Cannot query field "headerImageSize"')
    });

    expect(container.querySelector(".article-header-image")).toHaveAttribute(
      "data-header-image-size",
      "full"
    );
  });

  it("rewrites staging upload URLs in GraphQL-rendered article HTML", () => {
    const { container } = renderPost(
      { data: undefined },
      {
        content:
          '<p><img src="https://staging-wp.hectv.org/wp-content/uploads/2026/07/article.jpg"></p>'
      }
    );

    expect(container.querySelector(".blog-content img")).toHaveAttribute(
      "src",
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/07/article.jpg"
    );
  });
});
