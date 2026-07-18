import React from "react";
import { render, screen } from "@testing-library/react";
import Header from "./index";

const buildMenu = links => ({
  edges: [
    {
      node: {
        menuItems: {
          edges: links.map(({ url, label, children }) => ({
            node: {
              url,
              label,
              childItems: children
                ? { edges: children.map(c => ({ node: c })) }
                : undefined
            }
          }))
        }
      }
    }
  ]
});

describe("Header (primary navigation)", () => {
  it("renders without crashing when no menu data is provided yet", () => {
    render(<Header searchFunc={() => {}} />);
    expect(screen.getByAltText("HECTV logo")).toBeInTheDocument();
  });

  it("renders top-level nav links from the WPGraphQL header menu", () => {
    const header = buildMenu([
      { url: "https://hectv.org/programs", label: "Programs" },
      { url: "https://hectv.org/events", label: "Events" }
    ]);

    render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it.each([320, 1440])(
    "keeps the tagline and primary nav hooks at %ipx",
    width => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width
      });
      const header = buildMenu([
        { url: "https://hectv.org/programs", label: "Programs" }
      ]);

      const { container } = render(
        <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
      );

      expect(container.querySelector(".header-tagline")).toBeInTheDocument();
      expect(screen.getByText("Programs").closest("a")).toHaveClass(
        "header-nav-link"
      );
    }
  );

  it("renders a dropdown parent for nav items that carry child items", () => {
    const header = buildMenu([
      {
        url: "https://hectv.org/about",
        label: "About",
        children: [{ url: "https://hectv.org/about/team", label: "Our Team" }]
      }
    ]);

    render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Our Team")).toBeInTheDocument();
  });

  it("renders a search toggle button in the nav", () => {
    const { container } = render(<Header searchFunc={() => {}} />);
    expect(container.querySelector(".search-btn-icon")).toBeInTheDocument();
  });
});
