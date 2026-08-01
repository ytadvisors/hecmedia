import React from "react";
import { render } from "@testing-library/react";
import { BottomNav } from ".";

describe("BottomNav", () => {
  it("renders modern footer links when the legacy menu collection is empty", () => {
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
});
