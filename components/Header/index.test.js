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

  it("closes an open dropdown after a navigation link is selected", () => {
    const header = buildMenu([
      {
        url: "https://hectv.org/about",
        label: "About",
        children: [{ url: "https://hectv.org/about/team", label: "Our Team" }]
      }
    ]);

    const { container } = render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );
    const dropdown = container.querySelector(".top-navigation > li.dropdown");

    fireEvent.click(screen.getByText("About"));
    expect(dropdown).toHaveClass("open");

    fireEvent.click(screen.getByText("Our Team"), { ctrlKey: true });
    expect(dropdown).not.toHaveClass("open");
  });

  it("preserves the top-level order supplied by the WordPress menu tree", () => {
    const header = buildMenu([
      { url: "https://hectv.org/about", label: "About" },
      { url: "https://hectv.org/programs", label: "Programs" },
      { url: "https://hectv.org/watch", label: "Watch Now" }
    ]);

    const { container } = render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    expect(
      Array.from(container.querySelectorAll(".top-navigation > li a")).map(
        link => link.textContent.trim()
      )
    ).toEqual(["About", "Programs", "Watch Now"]);
  });

  it("renders a search toggle button in the nav", () => {
    const { container } = render(<Header searchFunc={() => {}} />);
    expect(container.querySelector(".search-btn-icon")).toBeInTheDocument();
  });

  it("does not render top-bar CTAs when no CTA data is provided", () => {
    const { container } = render(<Header searchFunc={() => {}} />);

    expect(container.querySelector(".top-bar-actions")).not.toBeInTheDocument();
  });

  it("renders top-bar CTAs from the topbarCtas prop, not hardcoded links", () => {
    const topbarCtas = [
      { label: "Subscribe", url: "/newsletter" },
      { label: "Support", url: "/support" },
      { label: "Get Involved", url: "/get-involved" }
    ];
    render(<Header searchFunc={() => {}} topbarCtas={topbarCtas} />);

    expect(screen.getByRole("link", { name: "Subscribe" })).toHaveAttribute(
      "href",
      "/newsletter"
    );
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute(
      "href",
      "/support"
    );
    expect(screen.getByRole("link", { name: "Get Involved" })).toHaveAttribute(
      "href",
      "/get-involved"
    );
  });

  it("groups social links and CTA pills together on the second row, away from search", () => {
    const social = buildMenu([
      { url: "https://facebook.com/hectv", label: "Facebook" }
    ]);
    const topbarCtas = [{ label: "Subscribe", url: "/newsletter" }];
    const { container } = render(
      <Header searchFunc={() => {}} social={social} topbarCtas={topbarCtas} />
    );

    const secondaryRow = container.querySelector(".header-secondary-row");
    expect(secondaryRow).toBeInTheDocument();
    expect(secondaryRow.querySelector(".social-links")).toBeInTheDocument();
    expect(secondaryRow.querySelector(".top-bar-actions")).toBeInTheDocument();

    const topRow = container.querySelector(".header-top-row");
    expect(topRow.querySelector(".search-btn-icon")).toBeInTheDocument();
    expect(topRow.querySelector(".top-bar-actions")).not.toBeInTheDocument();
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
