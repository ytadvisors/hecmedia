import React from "react";
import { render, screen } from "@testing-library/react";
import SocialLinks from "./index";

describe("SocialLinks", () => {
  it("renders a link per entry, in order, with the given href", () => {
    const links = [
      { link: "https://facebook.com/hectv", icon: "FB" },
      { link: "https://twitter.com/hectv", icon: "TW" }
    ];

    render(<SocialLinks links={links} />);

    const anchors = screen.getAllByRole("link");
    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toHaveAttribute("href", "https://facebook.com/hectv");
    expect(anchors[1]).toHaveAttribute("href", "https://twitter.com/hectv");
  });

  it("renders nothing when links is empty", () => {
    render(<SocialLinks links={[]} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
