import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import { Layout } from "./index";
import { GET_HEADER_MENU, GET_LEGACY_HEADER_MENU } from "../../lib/graphql";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("../../routes", () => ({
  Router: { pushRoute: jest.fn() }
}));

jest.mock("../../components/ProgramViewer", () => {
  const MockReact = require("react");
  return ({ featuredVideos = [], newestVideos = [], trendingNowError }) =>
    MockReact.createElement(
      "div",
      { "data-testid": "program-viewer" },
      trendingNowError
        ? "Trending stories are unavailable right now."
        : featuredVideos
            .concat(newestVideos)
            .map(post => post.title)
            .join(", ")
    );
});

jest.mock("../../components/Header", () => {
  const MockReact = require("react");
  return ({ header, topbarCtas = [] }) =>
    MockReact.createElement(
      "div",
      { "data-testid": "header" },
      header &&
        header.edges &&
        header.edges
          .flatMap(({ node }) => node.menuItems.edges)
          .map(({ node }) => node.label)
          .join(", "),
      topbarCtas.map(cta => `${cta.label}:${cta.url}`).join(", ")
    );
});
jest.mock("../../components/Banner", () => {
  const MockReact = require("react");
  return () => MockReact.createElement("div");
});
jest.mock("../../components/Footer", () => {
  const MockReact = require("react");
  // Layout imports getFooterMenuItemEdges (named) for GraphQL vs REST.
  const getFooterMenuItemEdges = footer => {
    if (!footer || !Array.isArray(footer.edges) || footer.edges.length === 0) {
      return [];
    }
    const first = footer.edges[0] || {};
    const node = first.node || {};
    const menuItems = node.menuItems || {};
    const { edges } = menuItems;
    return Array.isArray(edges) ? edges.filter(e => e && e.node) : [];
  };
  return {
    __esModule: true,
    default: () => MockReact.createElement("div"),
    getFooterMenuItemEdges
  };
});

jest.mock("../../lib/wpMenuRest", () => ({
  fetchMenuBySlug: jest.fn().mockResolvedValue(null)
}));
jest.mock("../../components/BottomNav", () => {
  const MockReact = require("react");
  return () => MockReact.createElement("div");
});
jest.mock("../Modals", () => {
  const MockReact = require("react");
  return { BasicModal: () => MockReact.createElement("div") };
});

/**
 * Layout fires 9 useQuery hooks in this order:
 * layout, header, footer, social, topbar, siteContent, newestVideos,
 * curatedTrending, liveVideos.
 */
const emptyQuery = { data: undefined };

describe("Layout", () => {
  beforeEach(() => {
    useQuery.mockReset();
  });

  it("supplies curated and newest videos to Trending Now without using Spotlight", () => {
    const featuredVideos = [
      { postId: 1, title: "Editor's choice", link: "/posts/featured" }
    ];
    const newestVideos = [
      { postId: 2, title: "Newest video", link: "/posts/newest" }
    ];

    useQuery
      .mockReturnValueOnce({
        data: { spotLight: { nodes: [{ title: "Spotlight only" }] } },
        loading: false
      }) // layout
      .mockReturnValueOnce(emptyQuery) // header
      .mockReturnValueOnce(emptyQuery) // footer
      .mockReturnValueOnce(emptyQuery) // social
      .mockReturnValueOnce(emptyQuery) // header actions menu
      .mockReturnValueOnce(emptyQuery) // topbar option fallback
      .mockReturnValueOnce({
        data: { hectvSiteContent: { trendingPostIds: [1] } }
      }) // siteContent
      .mockReturnValueOnce({ data: { newestVideos: { nodes: newestVideos } } })
      .mockReturnValueOnce({
        data: { curatedTrendingPosts: { nodes: featuredVideos } }
      })
      .mockReturnValueOnce(emptyQuery); // liveVideos

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("program-viewer")).toHaveTextContent(
      "Editor's choice, Newest video"
    );
  });

  it("passes Subscribe/Support CTAs from the HEADER_ACTIONS menu to Header", () => {
    const headerActions = {
      edges: [
        {
          node: {
            label: "Subscribe",
            path: "/newsletter",
            url: "https://staging-wp.hectv.org/newsletter",
            cssClasses: ["primary"],
            parentDatabaseId: 0
          }
        },
        {
          node: {
            label: "Support",
            path: "/donate",
            url: "https://staging-wp.hectv.org/donate",
            cssClasses: ["secondary"],
            parentDatabaseId: 0
          }
        }
      ]
    };

    useQuery
      .mockReturnValueOnce({ data: {}, loading: false }) // layout
      .mockReturnValueOnce(emptyQuery) // header
      .mockReturnValueOnce(emptyQuery) // footer
      .mockReturnValueOnce(emptyQuery) // social
      .mockReturnValueOnce({ data: { headerActions } }) // header actions menu
      .mockReturnValueOnce({
        data: {
          topbarCtas: [{ label: "Stale", url: "/stale", style: "primary" }]
        }
      }) // option must not win over menu
      .mockReturnValueOnce(emptyQuery) // siteContent
      .mockReturnValueOnce(emptyQuery) // newest
      .mockReturnValueOnce(emptyQuery) // curated
      .mockReturnValueOnce(emptyQuery); // live

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Subscribe:/newsletter, Support:/donate"
    );
  });

  it("falls back to topbarCtas option when the Header Actions menu is empty", () => {
    const topbarCtas = [
      { label: "Watch Live", url: "/live", style: "primary" },
      { label: "Donate", url: "/donate", style: "secondary" }
    ];

    useQuery
      .mockReturnValueOnce({ data: {}, loading: false }) // layout
      .mockReturnValueOnce(emptyQuery) // header
      .mockReturnValueOnce(emptyQuery) // footer
      .mockReturnValueOnce(emptyQuery) // social
      .mockReturnValueOnce({ data: { headerActions: { edges: [] } } }) // empty menu
      .mockReturnValueOnce({ data: { topbarCtas } }) // topbar option
      .mockReturnValueOnce(emptyQuery) // siteContent
      .mockReturnValueOnce(emptyQuery) // newest
      .mockReturnValueOnce(emptyQuery) // curated
      .mockReturnValueOnce(emptyQuery); // live

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Watch Live:/live, Donate:/donate"
    );
  });

  it("keeps the shell usable when menu and optional CTA queries fail", () => {
    useQuery
      .mockReturnValueOnce({ data: {}, loading: false })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce({
        data: undefined,
        error: new Error(
          'Value "HEADER_ACTIONS" does not exist in "MenuLocationEnum"'
        )
      })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error('Cannot query field "topbarCtas" on type "RootQuery".')
      })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery);

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Subscribe:/newsletter, Support:/support"
    );
  });

  it("keeps newest videos visible when no curated posts are configured", () => {
    const newestVideos = [
      { postId: 2, title: "Newest video", link: "/posts/newest" }
    ];

    useQuery
      .mockReturnValueOnce({ data: {}, loading: false })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery) // header actions
      .mockReturnValueOnce(emptyQuery) // topbar option
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce({
        data: { newestVideos: { nodes: newestVideos } },
        loading: false
      })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery);

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("program-viewer")).toHaveTextContent(
      "Newest video"
    );
    expect(screen.getByTestId("program-viewer")).not.toHaveTextContent(
      "unavailable"
    );
  });

  it("uses the isolated header menu without coupling it to layout data", () => {
    const header = {
      edges: [
        {
          node: {
            menuItems: {
              edges: [{ node: { label: "PROGRAMS" } }]
            }
          }
        }
      ]
    };

    useQuery
      .mockReturnValueOnce({ data: { footer: {}, social: {} } })
      .mockReturnValueOnce({ data: { header } })
      .mockReturnValueOnce(emptyQuery) // footer menu
      .mockReturnValueOnce(emptyQuery) // social menu
      .mockReturnValueOnce(emptyQuery) // header actions
      .mockReturnValueOnce(emptyQuery) // topbar option
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery);

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent("PROGRAMS");
  });

  it("keeps the shell usable when the isolated header menu is unavailable", () => {
    useQuery
      .mockReturnValueOnce({ data: { footer: {}, social: {} } })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error(
          'Cannot query field "parentDatabaseId" on type "MenuItem".'
        )
      })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery) // header actions
      .mockReturnValueOnce(emptyQuery) // topbar option
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery);

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Subscribe:/newsletter, Support:/support"
    );
  });

  it("selects the isolated legacy header operation when modern CMS mode is disabled", () => {
    const header = {
      edges: [
        {
          node: {
            menuItems: {
              edges: [{ node: { label: "ABOUT" } }]
            }
          }
        }
      ]
    };

    const previousModern = process.env.HECMEDIA_MODERN_WPGRAPHQL;
    process.env.HECMEDIA_MODERN_WPGRAPHQL = "false";

    useQuery
      .mockReturnValueOnce({ data: { footer: {}, social: {} } })
      .mockReturnValueOnce({ data: { header } })
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery) // header actions (skipped when legacy)
      .mockReturnValueOnce(emptyQuery) // topbar option
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(emptyQuery);

    try {
      render(<Layout dispatch={jest.fn()} />);

      expect(useQuery.mock.calls[1][0]).toBe(GET_LEGACY_HEADER_MENU);
      expect(useQuery.mock.calls[1][0]).not.toBe(GET_HEADER_MENU);
      expect(screen.getByTestId("header")).toHaveTextContent("ABOUT");
    } finally {
      if (previousModern === undefined) {
        delete process.env.HECMEDIA_MODERN_WPGRAPHQL;
      } else {
        process.env.HECMEDIA_MODERN_WPGRAPHQL = previousModern;
      }
    }
  });
});
