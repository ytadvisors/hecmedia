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

jest.mock("../../components/ProgramViewer", () => ({
  featuredVideos = [],
  newestVideos = []
}) => (
  <div data-testid="program-viewer">
    {featuredVideos.concat(newestVideos).map(post => post.title).join(", ")}
  </div>
));

jest.mock("../../components/Header", () => ({ topbarCtas = [] }) => (
  <div data-testid="header">
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
      .mockReturnValueOnce({
        data: undefined,
        error: new Error('Cannot query field "topbarCtas" on type "RootQuery".')
      })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("header")).toBeEmptyDOMElement();
  });
});
