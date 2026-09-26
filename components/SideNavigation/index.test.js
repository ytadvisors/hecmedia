import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("tries the public archive, active WordPress, and default promo in order", () => {
    const originalHost = process.env.WP_HOST;
    process.env.WP_HOST = "https://prod-wp.hectv.org";

    try {
      render(
        <SideNavigation
          railPromo={{
            image: {
              sourceUrl:
                "https://prod-wp.hectv.org/wp-content/uploads/2026/08/For-Educators.jpg",
              altText: "For Educators"
            },
            url: "/category/education"
          }}
        />
      );

      const image = screen.getByRole("img", { name: "For Educators" });
      expect(image).toHaveAttribute(
        "src",
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/08/For-Educators.jpg"
      );

      fireEvent.error(image);
      expect(image).toHaveAttribute(
        "src",
        "https://prod-wp.hectv.org/wp-content/uploads/2026/08/For-Educators.jpg"
      );

      fireEvent.error(image);
      expect(image).toHaveAttribute("src", DEFAULT_RAIL_PROMO.image.sourceUrl);

      fireEvent.error(image);
      expect(image).toHaveAttribute("src", DEFAULT_RAIL_PROMO.image.sourceUrl);
    } finally {
      if (originalHost === undefined) delete process.env.WP_HOST;
      else process.env.WP_HOST = originalHost;
    }
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

  it("preserves already-public media URLs (including non-offloaded staging uploads)", () => {
    const originalHost = process.env.WP_HOST;
    process.env.WP_HOST = "https://wordpress-staging.example.com";

    // CDN / offloaded URL — leave alone
    expect(getPublicRailPromoUrl("https://cdn.example.com/educators.png")).toBe(
      "https://cdn.example.com/educators.png"
    );

    // GraphQL often returns staging-wp for freshly selected logos that have not
    // been Media-Offloaded to S3 yet. Blind S3 rewrite 403s; keep GraphQL URL.
    expect(
      getPublicRailPromoUrl(
        "https://staging-wp.hectv.org/wp-content/uploads/2026/08/For-Educators-scaled.jpg"
      )
    ).toBe(
      "https://staging-wp.hectv.org/wp-content/uploads/2026/08/For-Educators-scaled.jpg"
    );

    // S3 URL returned when Offload Media has synced — leave alone
    expect(
      getPublicRailPromoUrl(
        "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/08/For-Educators-scaled.jpg"
      )
    ).toBe(
      "https://prd-hectv-wp-media.s3.us-east-2.amazonaws.com/wp-content/uploads/2026/08/For-Educators-scaled.jpg"
    );

    if (originalHost === undefined) delete process.env.WP_HOST;
    else process.env.WP_HOST = originalHost;
  });

  it("ships the educator artwork from the frontend CDN path", () => {
    expect(DEFAULT_RAIL_PROMO).toMatchObject({
      image: {
        sourceUrl:
          "https://asset.ytadvisors.com/client-documents/hecmedia/media-library/3ca97ec68430409a-For-Educators.jpg",
        altText: "For Educators"
      },
      url: "/category/education"
    });
  });
});
