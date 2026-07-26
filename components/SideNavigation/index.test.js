import React from "react";
import { render, screen } from "@testing-library/react";
import { getPublicRailPromoUrl, SideNavigation } from "./index";
import { DEFAULT_RAIL_PROMO } from "../../lib/stagingCompatibility";

describe("SideNavigation", () => {
  it("renders its children inside a section", () => {
    render(
      <SideNavigation>
        <p>Nav content</p>
      </SideNavigation>
    );

    expect(screen.getByText("Nav content")).toBeInTheDocument();
  });

  it("renders the editor-managed rail promo image and destination", async () => {
    render(
      <SideNavigation
        railPromo={{
          image: {
            sourceUrl: "https://img.test/for-educators.png",
            altText: "Image alt"
          },
          url: "/for-educators",
          alt: "For Educators"
        }}
      />
    );

    const promo = await screen.findByRole("link", { name: "For Educators" });
    expect(promo).toHaveClass("rail-promo");
    expect(promo).toHaveAttribute("href", "/for-educators");
    expect(screen.getByRole("img", { name: "For Educators" })).toHaveAttribute(
      "src",
      "https://img.test/for-educators.png"
    );
  });

  it("routes private WordPress media through the public staging host", () => {
    const originalHost = process.env.WP_HOST;
    process.env.WP_HOST = "https://wordpress-staging.example.com";

    expect(
      getPublicRailPromoUrl(
        "https://mba.tail1234.ts.net/wp-content/uploads/educators.png"
      )
    ).toBe(
      "https://wordpress-staging.example.com/wp-content/uploads/educators.png"
    );

    if (originalHost === undefined) delete process.env.WP_HOST;
    else process.env.WP_HOST = originalHost;
  });

  it("preserves already-public media URLs", () => {
    const originalHost = process.env.WP_HOST;
    process.env.WP_HOST = "https://wordpress-staging.example.com";

    expect(getPublicRailPromoUrl("https://cdn.example.com/educators.png")).toBe(
      "https://cdn.example.com/educators.png"
    );

    if (originalHost === undefined) delete process.env.WP_HOST;
    else process.env.WP_HOST = originalHost;
  });

  it("ships the educator artwork from the frontend CDN path", () => {
    expect(DEFAULT_RAIL_PROMO).toMatchObject({
      image: {
        sourceUrl: "/static/assets/for-educators-rail-promo.png",
        altText: "For Educators"
      },
      url: "/for-educators"
    });
  });
});
