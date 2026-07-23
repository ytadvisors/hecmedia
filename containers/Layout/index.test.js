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

jest.mock("../../components/ProgramViewer", () => ({ trendingPosts }) => (
  <div data-testid="program-viewer">
    {trendingPosts.map(post => post.title).join(", ")}
  </div>
));

jest.mock("../../components/Header", () => () => <div />);
jest.mock("../../components/Banner", () => () => <div />);
jest.mock("../../components/Footer", () => () => <div />);
jest.mock("../../components/BottomNav", () => () => <div />);
jest.mock("../Modals", () => ({ BasicModal: () => <div /> }));

describe("Layout", () => {
  it("supplies spotlight posts to Trending Now until a dedicated feed exists", () => {
    const spotLightPosts = [
      { postId: 1, title: "A current story", link: "/posts/current" }
    ];

    useQuery
      .mockReturnValueOnce({
        data: { spotLight: { nodes: spotLightPosts } },
        loading: false
      })
      .mockReturnValueOnce({ data: undefined });

    render(<Layout dispatch={jest.fn()} />);

    expect(screen.getByTestId("program-viewer")).toHaveTextContent(
      "A current story"
    );
  });
});
