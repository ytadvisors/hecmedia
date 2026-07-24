import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Header from "./index";

const buildMenuItems = links =>
  links.map(({ url, label, children }) => ({
    node: {
      url,
      label,
      childItems: children ? { edges: buildMenuItems(children) } : undefined
    }
  }));

const buildMenu = links => ({
  edges: [
    {
      node: {
        menuItems: {
          edges: buildMenuItems(links)
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

  it("renders a second CMS menu level and supports touch and keyboard controls", () => {
    const header = buildMenu([
      {
        url: "https://hectv.org/about",
        label: "About",
        children: [
          {
            url: "https://hectv.org/about/organization",
            label: "Our Organization",
            children: [
              {
                url: "https://hectv.org/about/leadership",
                label: "Leadership"
              }
            ]
          }
        ]
      }
    ]);
    const { container } = render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    fireEvent.click(screen.getByText("About"));
    const toggle = screen.getByRole("button", {
      name: "Show Our Organization submenu"
    });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelectorAll(".dropdown-menu .dropdown-menu")).toHaveLength(1);
    expect(screen.getByText("Leadership")).toBeVisible();

    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(toggle, { key: "ArrowRight" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
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

  it("renders CMS nav labels directly without synthetic preview grouping", () => {
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

    // CMS labels appear directly — no synthetic grouping layer
    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("Underwriting")).toBeInTheDocument();
    // Synthetic preview group labels must not appear
    expect(screen.queryByText("Watch")).not.toBeInTheDocument();
    expect(screen.queryByText("Learn & Explore")).not.toBeInTheDocument();
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

  it("drops CTA rows with a missing or empty label or URL", () => {
    const topbarCtas = [
      { label: "Watch Live", url: " /live " },
      { label: "Watch Live", url: "/live" },
      { label: "No URL" },
      { label: "Empty URL", url: "   " },
      { label: "", url: "/missing-label" },
      null
    ];

    render(<Header searchFunc={() => {}} topbarCtas={topbarCtas} />);

    expect(screen.getByRole("link", { name: "Watch Live" })).toHaveAttribute(
      "href",
      "/live"
    );
    expect(screen.queryByText("No URL")).not.toBeInTheDocument();
    expect(screen.queryByText("Empty URL")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".top-bar-cta")).toHaveLength(1);
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
