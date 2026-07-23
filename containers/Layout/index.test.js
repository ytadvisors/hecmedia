import React from "react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/react-hooks";
import { GET_LAYOUT, GET_LIVE_VIDEOS } from "../../lib/graphql";
import Header from "../../components/Header";
import { Layout } from "./index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: jest.fn()
}));

jest.mock("../../routes", () => ({
  Router: { pushRoute: jest.fn() }
}));

jest.mock("../../components/ProgramViewer", () => ({ children, trendingPosts }) => (
  <div data-testid="program-viewer">
    {trendingPosts.map(post => post.title).join(", ")}
    {children}
  </div>
));

jest.mock("../../components/Header", () => jest.fn(() => <div />));
jest.mock("../../components/Banner", () => () => <div />);
jest.mock("../../components/Footer", () => () => <div />);
jest.mock("../../components/BottomNav", () => () => <div />);
jest.mock("../Modals", () => ({ BasicModal: () => <div /> }));

describe("Layout", () => {
  const spotLightPosts = [
    { postId: 1, title: "A current story", link: "/posts/current" }
  ];
  const ctas = [
    { label: "Watch Live", url: "/live", style: "primary" },
    { label: "Subscribe", url: "/newsletter", style: "secondary" }
  ];

  beforeEach(() => {
    useQuery.mockImplementation(query => {
      if (query === GET_LAYOUT) {
        return {
          data: {
            header: { edges: [] },
            social: { edges: [] },
            footer: { edges: [] },
            featuredMagazines: { edges: [] },
            spotLight: { nodes: spotLightPosts },
            hectvSiteOptions: { topbarCtas: ctas }
          },
          loading: false,
          error: undefined
        };
      }
      if (query === GET_LIVE_VIDEOS) {
        return { data: { liveVideos: { edges: [] } } };
      }
      return { data: {} };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("supplies spotlight posts to Trending Now until a dedicated feed exists", () => {
    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("program-viewer")).toHaveTextContent(
      "A current story"
    );
  });

  it("passes topbarCtas from hectvSiteOptions to the production Header", () => {
    render(<Layout pageForm={{}} dispatch={jest.fn()} />);

    expect(Header).toHaveBeenCalledWith(
      expect.objectContaining({ topbarCtas: ctas }),
      expect.anything()
    );
  });

  it("defaults to no CTAs while site options are absent", () => {
    useQuery.mockImplementation(query => {
      if (query === GET_LAYOUT) return { data: {} };
      if (query === GET_LIVE_VIDEOS) {
        return { data: { liveVideos: { edges: [] } } };
      }
      return { data: {} };
    });

    render(<Layout pageForm={{}} dispatch={jest.fn()} />);

    expect(Header).toHaveBeenCalledWith(
      expect.objectContaining({ topbarCtas: [] }),
      expect.anything()
    );
  });
});
