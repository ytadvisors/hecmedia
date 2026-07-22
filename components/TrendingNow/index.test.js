import React from "react";
import { render, screen } from "@testing-library/react";
import TrendingNow from "./index";

describe("TrendingNow", () => {
  it("labels the fixture-driven experience as a staging preview", () => {
    const { container } = render(
      <TrendingNow
        spotlightPosts={[
          {
            postId: 1,
            title: "A current story",
            link: "https://hectv.org/posts/current",
            postDetails: {
              videoImage: { medium: "https://img.test/current.jpg" }
            }
          }
        ]}
      />
    );

    expect(screen.getByText("Trending Now")).toBeInTheDocument();
    expect(screen.getByText("Staging preview")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "A current story" })
    ).toHaveAttribute("href", "/posts/current");
    expect(container.querySelector(".trending-list img")).toHaveAttribute(
      "src",
      "https://img.test/current.jpg"
    );
  });

  it("renders a loading state", () => {
    render(<TrendingNow loading />);

    expect(screen.getByText("Loading trending stories…")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<TrendingNow spotlightPosts={[]} />);

    expect(
      screen.getByText("No trending stories are available yet.")
    ).toBeInTheDocument();
  });

  it("renders an error state", () => {
    render(<TrendingNow error={new Error("offline")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Trending stories are unavailable right now."
    );
  });
});
