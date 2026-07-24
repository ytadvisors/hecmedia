import React from "react";
import { render, screen } from "@testing-library/react";
import { SideNavigation } from "./index";

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
});
