import React from "react";
import { render, screen } from "@testing-library/react";
import ProgramViewer from "./index";

describe("ProgramViewer", () => {
  it("replaces the legacy Spotlight/newsletter block with the educators link", () => {
    render(
      <ProgramViewer>
        <div>content</div>
      </ProgramViewer>
    );

    expect(screen.getByRole("link", { name: "For Educators" })).toHaveAttribute(
      "href",
      "/spotlight"
    );
    expect(document.getElementById("subscribe")).not.toBeInTheDocument();
    expect(screen.queryByText("HEC-TV NewsLetter")).not.toBeInTheDocument();
  });
});
