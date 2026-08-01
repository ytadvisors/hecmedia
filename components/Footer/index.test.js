import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "./index";

const buildMenu = links => ({
  edges: [
    {
      node: {
        menuItems: {
          edges: links.map(({ url, label }) => ({ node: { url, label } }))
        }
      }
    }
  ]
});

describe("Footer", () => {
  it("renders without crashing when no menu data is provided", () => {
    render(<Footer />);
    expect(screen.getByAltText("logo")).toBeInTheDocument();
  });

  it("renders without crashing when menu connections are empty", () => {
    render(<Footer footer={{ edges: [] }} social={{ edges: [] }} />);
    expect(screen.getByAltText("logo")).toBeInTheDocument();
  });

  it("renders footer links from the WPGraphQL menu shape", () => {
    const footer = buildMenu([
      { url: "https://hectv.org/about", label: "About" },
      { url: "https://hectv.org/contact", label: "Contact" }
    ]);

    render(<Footer footer={footer} social={buildMenu([])} />);

    expect(screen.getByText("About")).toHaveAttribute("href", "/about");
    expect(screen.getByText("Contact")).toHaveAttribute("href", "/contact");
  });

  it("removes Twitter from both footer social groups", () => {
    const social = buildMenu([
      { url: "https://facebook.com/hectv", label: "Facebook" },
      { url: "https://twitter.com/hectv", label: "Twitter" },
      { url: "https://instagram.com/hectv", label: "Instagram" }
    ]);
    const { container } = render(<Footer social={social} />);

    const socialHrefs = Array.from(
      container.querySelectorAll(".social-links a")
    ).map(link => link.getAttribute("href"));
    expect(socialHrefs).toEqual([
      "https://facebook.com/hectv",
      "https://instagram.com/hectv",
      "https://facebook.com/hectv",
      "https://instagram.com/hectv"
    ]);
  });
});
