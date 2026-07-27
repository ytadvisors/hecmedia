import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import { Layout } from "./index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("../../routes", () => ({
  Router: { pushRoute: jest.fn() }
}));

jest.mock(
  "../../components/ProgramViewer",
  () => ({ featuredVideos = [], newestVideos = [], trendingNowError }) => (
    <div data-testid="program-viewer">
      {trendingNowError
        ? "Trending stories are unavailable right now."
        : featuredVideos
            .concat(newestVideos)
            .map(post => post.title)
            .join(", ")}
    </div>
  )
);

jest.mock("../../components/Header", () => ({ header, topbarCtas = [] }) => (
  <div data-testid="header">
    {header &&
      header.edges &&
      header.edges
        .flatMap(({ node }) => node.menuItems.edges)
        .map(({ node }) => node.label)
        .join(", ")}
    {topbarCtas.map(cta => `${cta.label}:${cta.url}`).join(", ")}
  </div>
));
jest.mock("../../components/Banner", () => () => <div />);
jest.mock("../../components/Footer", () => () => <div />);
jest.mock("../../components/BottomNav", () => () => <div />);
jest.mock("../Modals", () => ({ BasicModal: () => <div /> }));

describe("Layout", () => {
  beforeEach(() => {
    useQuery.mockReset();
  });

  it("supplies featured and newest videos to Trending Now without using Spotlight", () => {
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
      })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: { newestVideos: { nodes: newestVideos } } })
      .mockReturnValueOnce({ data: { featuredVideos } })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("program-viewer")).toHaveTextContent(
      "Editor's choice, Newest video"
    );
  });

  it("passes top-bar CTA rows from the layout query to Header", () => {
    const topbarCtas = [
      { label: "Watch Live", url: "/live", style: "primary" },
      { label: "Donate", url: "/donate", style: "secondary" }
    ];

    useQuery
      .mockReturnValueOnce({ data: {}, loading: false })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: { topbarCtas } })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Watch Live:/live, Donate:/donate"
    );
  });

  it("keeps the shell usable when the optional CTA query fails", () => {
    useQuery
      .mockReturnValueOnce({ data: {}, loading: false })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error('Cannot query field "topbarCtas" on type "RootQuery".')
      })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Subscribe:/subscribe, Support:/support, Get Involved:/get-involved"
    );
  });

  it("keeps newest videos visible when optional curation is unavailable", () => {
    const newestVideos = [
      { postId: 2, title: "Newest video", link: "/posts/newest" }
    ];

    useQuery
      .mockReturnValueOnce({ data: {}, loading: false })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({
        data: { newestVideos: { nodes: newestVideos } },
        loading: false
      })
      .mockReturnValueOnce({
        data: undefined,
        error: new Error(
          'Cannot query field "featuredVideos" on type "RootQuery".'
        )
      })
      .mockReturnValueOnce({ data: undefined });

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
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

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
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent(
      "Subscribe:/subscribe, Support:/support, Get Involved:/get-involved"
    );
  });

  it("falls back to the legacy layout header when the modern menu query is unavailable", () => {
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

    useQuery
      .mockReturnValueOnce({ data: { header } })
      .mockReturnValueOnce({ data: undefined, error: new Error("legacy CMS") })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toHaveTextContent("ABOUT");
  });
});
