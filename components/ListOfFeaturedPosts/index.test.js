import React from "react";
import { render, screen } from "@testing-library/react";
import ListOfFeaturedPosts from "./index";

describe("ListOfFeaturedPosts", () => {
  it("labels the existing Spotlight route as FOR EDUCATORS", () => {
    render(<ListOfFeaturedPosts spotLightPosts={[]} />);

    expect(screen.getByRole("link", { name: "FOR EDUCATORS" })).toHaveAttribute(
      "href",
      "/spotlight"
    );
    expect(screen.queryByText("HEC-TV Spotlight")).not.toBeInTheDocument();
  });

  it("renders an unlinked HEC-TV Spotlight title when used as a rail section", () => {
    const spotLightPosts = Array.from({ length: 6 }, (_, index) => ({
      title: `Spotlight ${index + 1}`,
      link: `https://hectv.org/posts/spotlight-${index + 1}`,
      postDetails: { videoImage: { large: "https://img.test/spotlight.jpg" } }
    }));

    render(
      <ListOfFeaturedPosts
        title="HEC-TV SPOTLIGHT"
        titleHref={null}
        spotLightPosts={spotLightPosts}
        maxItems={5}
      />
    );

    expect(screen.getByText("HEC-TV SPOTLIGHT")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "HEC-TV SPOTLIGHT" })).toBeNull();
    expect(document.querySelectorAll(".magazine-list > li")).toHaveLength(5);
    expect(document.querySelectorAll(".magazine-list img")).toHaveLength(5);
  });
});
