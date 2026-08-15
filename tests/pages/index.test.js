import React from "react";
import { render, screen, wait } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import HomePage from "../../pages/index";
import { fetchPageAcfLayout } from "../../lib/homeFeedDesign";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("../../lib/homeFeedDesign", () => {
  const actual = jest.requireActual("../../lib/homeFeedDesign");
  return {
    ...actual,
    fetchPageAcfLayout: jest.fn().mockResolvedValue(null)
  };
});

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
  return ({ posts, design }) =>
    MockReact.createElement(
      "div",
      {
        "data-testid": "list-of-posts",
        "data-row-count":
          design && design.newRowLayout ? design.newRowLayout.length : 0
      },
      `${posts.length} posts`
    );
});

describe("Homepage (pages/index.js)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    fetchPageAcfLayout.mockResolvedValue(null);
  });

  it("renders the page title and post feed once GET_HOME_PAGE resolves", () => {
    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          content: "On demand arts, culture & education programming",
          link: "https://hectv.org/home",
          requiredPosts: { postList: [] },
          feedDesign: {
            newRowLayout: [
              { rowLayout: "Featured", displayType: "Post" },
              { rowLayout: "3 Columns", displayType: "Post" }
            ],
            defaultDisplayType: "Post",
            defaultRowLayout: "Single Column"
          }
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
    expect(screen.getByTestId("list-of-posts")).toHaveAttribute(
      "data-row-count",
      "2"
    );
  });

  it("uses classic multi-row home feed design when GraphQL returns empty rows", () => {
    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          requiredPosts: { postList: [] },
          feedDesign: {
            newRowLayout: [],
            defaultDisplayType: "Post",
            defaultRowLayout: "Single Column"
          }
        },
        postData: {
          edges: [{ node: { postId: 1, title: "Post One" } }]
        }
      }
    });

    render(<HomePage />);

    // DEFAULT_HOME_FEED_DESIGN has 6 row layouts (Featured, 3 Col, …).
    expect(
      Number(screen.getByTestId("list-of-posts").getAttribute("data-row-count"))
    ).toBeGreaterThan(1);
  });

  it("hydrates CMS feed layout from REST when GraphQL newRowLayout is empty", async () => {
    fetchPageAcfLayout.mockResolvedValue({
      feedDesign: {
        newRowLayout: [
          { rowLayout: "Featured", displayType: "Post" },
          { rowLayout: "3 Columns", displayType: "Wallpaper" },
          { rowLayout: "Single Column", displayType: "Post" }
        ],
        defaultDisplayType: "Post",
        defaultRowLayout: "Single Column"
      },
      requiredPostIds: []
    });

    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          requiredPosts: { postList: [] },
          feedDesign: {
            newRowLayout: [],
            defaultDisplayType: "Post",
            defaultRowLayout: "Single Column"
          }
        },
        postData: {
          edges: [{ node: { postId: 1, title: "Post One" } }]
        }
      }
    });

    render(<HomePage />);

    await wait(() => {
      expect(fetchPageAcfLayout).toHaveBeenCalledWith("home");
      expect(screen.getByTestId("list-of-posts")).toHaveAttribute(
        "data-row-count",
        "3"
      );
    });
  });

  it("does not call REST fallback when GraphQL already has feed rows", async () => {
    useQuery.mockReturnValue({
      data: {
        pageData: {
          title: "Home",
          requiredPosts: { postList: [] },
          feedDesign: {
            newRowLayout: [
              { rowLayout: "Featured", displayType: "Post" },
              { rowLayout: "3 Columns", displayType: "Post" }
            ],
            defaultDisplayType: "Post",
            defaultRowLayout: "Single Column"
          }
        },
        postData: {
          edges: [{ node: { postId: 1, title: "Post One" } }]
        }
      }
    });

    render(<HomePage />);

    expect(screen.getByTestId("list-of-posts")).toHaveAttribute(
      "data-row-count",
      "2"
    );
    // Allow the effect to run; GraphQL rows present → REST must not fire.
    await wait(() => {
      expect(fetchPageAcfLayout).not.toHaveBeenCalled();
    });
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
          feedDesign: {
            newRowLayout: [{ rowLayout: "Featured", displayType: "Post" }],
            defaultDisplayType: "Post",
            defaultRowLayout: "Single Column"
          }
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
