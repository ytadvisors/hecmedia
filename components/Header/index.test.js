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
  const originalTopBarPreview = process.env.HECMEDIA_TOPBAR_CTA_PREVIEW;

  afterEach(() => {
    if (originalNavigationPreview === undefined) {
      delete process.env.HECMEDIA_NAVIGATION_PREVIEW;
    } else {
      process.env.HECMEDIA_NAVIGATION_PREVIEW = originalNavigationPreview;
    }
    if (originalTopBarPreview === undefined) {
      delete process.env.HECMEDIA_TOPBAR_CTA_PREVIEW;
    } else {
      process.env.HECMEDIA_TOPBAR_CTA_PREVIEW = originalTopBarPreview;
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

  it("renders staging-safe Watch Live, Subscribe, and Donate top-bar CTAs", () => {
    process.env.HECMEDIA_TOPBAR_CTA_PREVIEW = "true";
    render(<Header searchFunc={() => {}} />);

    expect(screen.getByRole("link", { name: "Watch Live" })).toHaveAttribute(
      "href",
      "/#watch-live"
    );
    expect(screen.getByRole("link", { name: "Subscribe" })).toHaveAttribute(
      "href",
      "/newsletter"
    );
    expect(
      screen.getByRole("button", { name: /Donate Staging only/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Staging only")).toBeVisible();
  });

  it("keeps the donation placeholder keyboard-accessible and transaction-free", () => {
    process.env.HECMEDIA_TOPBAR_CTA_PREVIEW = "true";
    render(<Header searchFunc={() => {}} />);

    const donate = screen.getByRole("button", {
      name: /Donate Staging only/i
    });
    donate.focus();
    expect(donate).toHaveFocus();
    fireEvent.keyDown(donate, { key: "Enter", code: "Enter" });
    fireEvent.click(donate);
    expect(
      screen.getByRole("status", {
        name: ""
      })
    ).toHaveTextContent("Donations are disabled in this staging preview.");
    expect(donate).not.toHaveAttribute("href");
  });

  it("keeps all three CTAs available in the mobile header", () => {
    process.env.HECMEDIA_TOPBAR_CTA_PREVIEW = "true";
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375
    });
    const { container } = render(<Header searchFunc={() => {}} />);

    expect(container.querySelector(".top-bar-actions")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Watch Live|Subscribe/ })
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /Donate Staging only/i })
    ).toBeVisible();
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
