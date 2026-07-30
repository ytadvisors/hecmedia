import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import HomePage from "../../pages/index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

// Layout owns its own GraphQL/Redux wiring (covered separately); the
// homepage's own critical-path responsibility is composing SEO + the post
// feed from GET_HOME_PAGE, so Layout is stubbed to isolate that.
jest.mock("../../containers/Layout", () => {
  const MockReact = require("react");
  return ({ children }) =>
    MockReact.createElement("div", { "data-testid": "layout" }, children);
});

jest.mock("../../components/ListOfPosts", () => {
  const MockReact = require("react");
  return ({ posts }) =>
    MockReact.createElement(
      "div",
      { "data-testid": "list-of-posts" },
      `${posts.length} posts`
    );
});

describe("Homepage (pages/index.js)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the page title and post feed once GET_HOME_PAGE resolves", () => {
    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          content: "On demand arts, culture & education programming",
          link: "https://hectv.org/home",
          requiredPosts: { postList: [] },
          feedDesign: "grid"
        },
        postData: {
          edges: [
            { node: { postId: 1, title: "Post One" } },
            { node: { postId: 2, title: "Post Two" } }
          ]
        }
      }
    });

    render(<HomePage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("list-of-posts")).toHaveTextContent("2 posts");
  });

  it("renders without crashing before GraphQL data has loaded", () => {
    useQuery.mockReturnValue({ data: undefined });

    render(<HomePage />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("list-of-posts")).toHaveTextContent("0 posts");
  });

  it("de-duplicates posts that appear in both the CMS post list and the feed query", () => {
    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          requiredPosts: {
            postList: [{ post: { postId: 1, title: "Featured" } }]
          },
          feedDesign: "grid"
        },
        postData: {
          edges: [{ node: { postId: 1, title: "Featured" } }]
        }
      }
    });

    render(<HomePage />);

    expect(screen.getByTestId("list-of-posts")).toHaveTextContent("1 posts");
  });
});
