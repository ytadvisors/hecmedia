import React from "react";
import { render } from "@testing-library/react";
import { BottomNav } from ".";

describe("BottomNav", () => {
  it("renders prop links for the more-from rail when provided", () => {
    const { getByText } = render(
      <BottomNav
        title="more from"
        links={[{ label: "Arts", url: "/category/arts" }]}
        data={{ bottomNav: { edges: [] } }}
      />
    );

    expect(getByText("Arts").closest("a")).toHaveAttribute(
      "href",
      "/category/arts"
    );
  });

  it("falls back to the GraphQL BottomNav menu (slug: bottomnav)", () => {
    const { getByText, queryByText } = render(
      <BottomNav
        title="more from"
        data={{
          bottomNav: {
            edges: [
              {
                node: {
                  menuItems: {
                    edges: [
                      {
                        node: {
                          label: "Education",
                          url:
                            "https://staging-wp.hectv.org/category/education/",
                          path: "/category/education/"
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        }}
      />
    );

    expect(getByText("Education").closest("a")).toHaveAttribute(
      "href",
      "/category/education/"
    );
    expect(queryByText("About Us")).not.toBeInTheDocument();
  });
});
