import React from "react";
import { render, screen } from "@testing-library/react";
import Footer, { getFooterMenuItemEdges, normalizeFooterLinks } from "./index";
import { restMenuToGraphqlShape } from "../../lib/wpMenuRest";

const buildMenu = links => ({
  edges: [
    {
      node: {
        menuItems: {
          edges: links.map(({ url, label, path }) => ({
            node: { url, label, path }
          }))
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

  it("renders footer links from the WPGraphQL footer menu", () => {
    const footer = buildMenu([
      { url: "https://staging-wp.hectv.org/about", label: "About" },
      {
        url: "https://staging-wp.hectv.org/contact",
        path: "/contact/",
        label: "Contact"
      }
    ]);

    render(<Footer footer={footer} social={buildMenu([])} />);

    expect(screen.getByText("About")).toHaveAttribute("href", "/about");
    // Absolute url wins over path when both are present.
    expect(screen.getByText("Contact")).toHaveAttribute("href", "/contact");
  });

  it("opens external footer destinations in a new tab and keeps site hosts in-app", () => {
    const footer = buildMenu([
      { url: "https://hecmedia.org/about-us", label: "About Us" },
      { url: "https://partner.example/help", label: "Partner Help" }
    ]);

    render(<Footer footer={footer} social={buildMenu([])} />);

    const about = screen.getByText("About Us");
    expect(about).toHaveAttribute("href", "/about-us");
    expect(about).not.toHaveAttribute("target", "_blank");

    const partner = screen.getByText("Partner Help");
    expect(partner).toHaveAttribute("href", "https://partner.example/help");
    expect(partner).toHaveAttribute("target", "_blank");
    expect(partner).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to CMS footerLinks when the footer menu is empty", () => {
    render(
      <Footer
        footer={{ edges: [] }}
        links={[
          { label: "Arts", url: "/category/arts" },
          { label: "Education", url: "/category/education" }
        ]}
      />
    );
    expect(screen.getByText("Arts")).toHaveAttribute("href", "/category/arts");
    expect(screen.getByText("Education")).toHaveAttribute(
      "href",
      "/category/education"
    );
  });

  it("prefers the WordPress footer menu over CMS fallback links", () => {
    const footer = buildMenu([
      { url: "https://staging-wp.hectv.org/about", label: "About" }
    ]);
    render(
      <Footer
        footer={footer}
        links={[{ label: "Arts", url: "/category/arts" }]}
      />
    );
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.queryByText("Arts")).not.toBeInTheDocument();
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

  it("preserves external social destinations from the REST fallback", () => {
    const social = restMenuToGraphqlShape({
      name: "Social",
      slug: "social",
      items: [
        {
          title: "Facebook",
          url: "https://facebook.com/hectv",
          object_slug: "hectv"
        }
      ]
    });
    const { container } = render(<Footer social={social} />);

    const socialHrefs = Array.from(
      container.querySelectorAll(".social-links a")
    ).map(link => link.getAttribute("href"));
    expect(socialHrefs).toEqual([
      "https://facebook.com/hectv",
      "https://facebook.com/hectv"
    ]);
  });
});

describe("footer menu helpers", () => {
  it("extracts edges from the menus(slug:footer) connection", () => {
    const footer = buildMenu([
      { label: "A", url: "https://staging-wp.hectv.org/a", path: "/a/" }
    ]);
    const edges = getFooterMenuItemEdges(footer);
    expect(edges).toHaveLength(1);
    expect(edges[0].node.label).toBe("A");
  });

  it("normalizeFooterLinks rewrites staging-wp hosts", () => {
    const edges = [
      {
        node: {
          label: "Arts",
          url: "https://staging-wp.hectv.org/category/arts/",
          path: "/category/arts/"
        }
      }
    ];
    expect(normalizeFooterLinks(edges, [])).toEqual([
      { label: "Arts", url: "/category/arts/", external: false }
    ]);
  });
});
