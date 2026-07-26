import React from "react";
import { render, screen } from "@testing-library/react";
import TrendingNow from "./index";

describe("TrendingNow", () => {
  it("renders thumbnail links without a staging-only label", () => {
    const { container } = render(
      <TrendingNow
        newestVideos={[
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
    expect(screen.queryByText(/Staging preview/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "A current story" })
    ).toHaveAttribute("href", "/posts/current");
    expect(container.querySelector(".trending-list img")).toHaveAttribute(
      "src",
      "https://img.test/current.jpg"
    );
  });

  it("renders a branded thumbnail fallback when WordPress has no image", () => {
    const { container } = render(
      <TrendingNow
        featuredVideos={[
          {
            postId: 12,
            title: "Featured story",
            link: "/featured-story"
          }
        ]}
        newestVideos={[]}
        loading={false}
      />
    );

    expect(container.querySelector(".trending-list img")).toHaveAttribute(
      "src",
      "/static/assets/spotlight-img.jpg"
    );
  });

  it("renders a loading state", () => {
    render(<TrendingNow loading />);

    expect(screen.getByText("Loading trending stories…")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<TrendingNow featuredVideos={[]} newestVideos={[]} />);

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
