import React from "react";
import { render, screen } from "@testing-library/react";
import SideNavigation from "./index";

describe("SideNavigation", () => {
  it("renders its children inside a section", () => {
    render(
      <SideNavigation>
        <p>Nav content</p>
      </SideNavigation>
    );

    expect(screen.getByText("Nav content")).toBeInTheDocument();
  });
});
