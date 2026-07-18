import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  const originalNavigationPreview = process.env.HECMEDIA_NAVIGATION_PREVIEW;

  afterEach(() => {
    if (originalNavigationPreview === undefined) {
      delete process.env.HECMEDIA_NAVIGATION_PREVIEW;
    } else {
      process.env.HECMEDIA_NAVIGATION_PREVIEW = originalNavigationPreview;
    }
  });

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
    const programsLink = screen.getByText("Programs").closest("a");
    programsLink.focus();
    expect(programsLink).toHaveFocus();
  });

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

  it("uses the five-item staging preview without changing CMS links", () => {
    process.env.HECMEDIA_NAVIGATION_PREVIEW = "true";
    const header = buildMenu([
      { url: "https://hectv.org/", label: "Home" },
      { url: "https://hectv.org/programs", label: "Programs" },
      { url: "https://hectv.org/education", label: "Education" },
      { url: "https://hectv.org/events", label: "Events" },
      { url: "https://hectv.org/about", label: "About" },
      { url: "https://hectv.org/donate", label: "Donate" },
      { url: "https://hectv.org/magazines", label: "Magazines" },
      { url: "https://hectv.org/contact", label: "Contact" },
      { url: "https://hectv.org/underwriting", label: "Underwriting" }
    ]);

    render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    expect(
      document.querySelectorAll(".top-navigation > li.dropdown")
    ).toHaveLength(5);
    [
      "Home",
      "Watch",
      "Learn & Explore",
      "Connect",
      "Support HEC Media"
    ].forEach(label =>
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    );
    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("Underwriting")).toBeInTheDocument();
  });

  it("renders a search toggle button in the nav", () => {
    const { container } = render(<Header searchFunc={() => {}} />);
    expect(container.querySelector(".search-btn-icon")).toBeInTheDocument();
  });

  it("keeps its layout space while applying the sticky, scrolled treatment", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 120
    });
    const { container } = render(<Header searchFunc={() => {}} />);

    fireEvent.scroll(window);
    expect(container.querySelector("header")).toHaveClass(
      "header--sticky",
      "header--scrolled"
    );
  });
});
