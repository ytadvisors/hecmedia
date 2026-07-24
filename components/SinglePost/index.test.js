import React from "react";
import { render } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import SinglePost, { normalizeHeaderImageSize } from "./index";
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

function renderPost(queryResult) {
  useQuery.mockImplementation(query => {
    if (query === GET_POST_HEADER_IMAGE_SIZE) return queryResult;
    return {};
  });
  return render(<SinglePost post={post} />);
}

describe("article header image sizing", () => {
  afterEach(() => jest.clearAllMocks());

  it.each([undefined, null, "", "unexpected"])(
    "uses full width when the optional field is %p",
    value => {
      expect(normalizeHeaderImageSize(value)).toBe("full");
    }
  );

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
});
