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

  it("renders without crashing when WordPress returns an empty menu connection", () => {
    render(<Header searchFunc={() => {}} header={{ edges: [] }} />);
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

  it("opens a dropdown when its top-level toggle is clicked", () => {
    const header = buildMenu([
      {
        url: "https://hectv.org/genres",
        label: "Genres",
        children: [{ url: "https://hectv.org/genres/books", label: "Books" }]
      }
    ]);
    const { container } = render(
      <Header searchFunc={() => {}} header={header} social={buildMenu([])} />
    );

    const dropdown = container.querySelector(".top-navigation > li.dropdown");
    const toggle = screen.getByText("Genres").closest("a");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(dropdown).toHaveClass("open");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(dropdown).not.toHaveClass("open");
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

    fireEvent.click(container.querySelector(".navbar-toggle"));
    expect(container.querySelector(".navbar-collapse")).not.toHaveClass(
      "collapse"
    );
    fireEvent.click(screen.getByText("About"));
    const toggle = screen.getByRole("button", {
      name: "Show Our Organization submenu"
    });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".navbar-collapse")).not.toHaveClass(
      "collapse"
    );
    expect(
      container.querySelectorAll(".dropdown-menu .dropdown-menu")
    ).toHaveLength(1);
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

  it("places the mobile navigation toggle after search at the right edge", () => {
    const { container } = render(<Header searchFunc={() => {}} />);
    const actions = container.querySelector(".header-top-actions");

    expect(actions.firstElementChild).toHaveClass("user-admin");
    expect(actions.lastElementChild).toHaveClass("navbar-toggle");
  });

  it("does not render top-bar CTAs when no CTA data is provided", () => {
    const { container } = render(<Header searchFunc={() => {}} />);

    expect(container.querySelector(".top-bar-actions")).not.toBeInTheDocument();
  });

  it("renders top-bar CTAs from the topbarCtas prop, not hardcoded links", () => {
    const topbarCtas = [
      { label: "SUBSCRIBE", url: "/newsletter" },
      { label: "SUPPORT", url: "/support" },
      { label: "GET INVOLVED", url: "/get-involved" }
    ];
    render(<Header searchFunc={() => {}} topbarCtas={topbarCtas} />);

    expect(screen.getByRole("link", { name: "SUBSCRIBE" })).toHaveAttribute(
      "href",
      "/newsletter"
    );
    expect(screen.getByRole("link", { name: "SUPPORT" })).toHaveAttribute(
      "href",
      "/support"
    );
    expect(screen.getByRole("link", { name: "GET INVOLVED" })).toHaveAttribute(
      "href",
      "/get-involved"
    );
  });

  it("renders configured same-site CTA destinations as relative links", () => {
    render(
      <Header
        searchFunc={() => {}}
        topbarCtas={[
          { label: "SUBSCRIBE", url: "https://hecmedia.org/subscribe" },
          { label: "SUPPORT", url: "https://hectv.org/support" }
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "SUBSCRIBE" })).toHaveAttribute(
      "href",
      "/subscribe"
    );
    expect(screen.getByRole("link", { name: "SUPPORT" })).toHaveAttribute(
      "href",
      "/support"
    );
  });

  it("drops CTA rows with a missing or empty label or URL", () => {
    const topbarCtas = [
      { label: "Watch Live", url: " /live " },
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

  it("preserves the CMS CTA order and count without synthesizing fallback links", () => {
    const topbarCtas = [
      { label: "GET INVOLVED", url: "/get-involved" },
      { label: "SUBSCRIBE", url: "/subscribe" },
      { label: "SUBSCRIBE", url: "/subscribe" }
    ];
    const { container } = render(
      <Header searchFunc={() => {}} topbarCtas={topbarCtas} />
    );

    expect(
      Array.from(container.querySelectorAll(".top-bar-cta")).map(link => ({
        label: link.textContent,
        url: link.getAttribute("href")
      }))
    ).toEqual(topbarCtas);
  });

  it("groups social links and CTA buttons beside the logo, away from search", () => {
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
    expect(
      topRow.querySelector(".brand-information .top-bar-actions")
    ).toBeInTheDocument();
    expect(
      topRow.querySelector(".header-top-actions .top-bar-actions")
    ).not.toBeInTheDocument();
  });

  it("removes Twitter from the rendered social links", () => {
    const social = buildMenu([
      { url: "https://facebook.com/hectv", label: "Facebook" },
      { url: "https://twitter.com/hectv", label: "Twitter" },
      { url: "https://instagram.com/hectv", label: "Instagram" }
    ]);
    const { container } = render(
      <Header searchFunc={() => {}} social={social} />
    );

    const socialHrefs = Array.from(
      container.querySelectorAll(".social-links a")
    ).map(link => link.getAttribute("href"));
    expect(socialHrefs).toEqual([
      "https://facebook.com/hectv",
      "https://instagram.com/hectv"
    ]);
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
