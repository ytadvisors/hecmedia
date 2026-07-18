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
});
