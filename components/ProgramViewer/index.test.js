import React from "react";
import { render, screen } from "@testing-library/react";
import ProgramViewer from "./index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: () => ({ data: {} })
}));

describe("ProgramViewer", () => {
  it("stacks the home rail in mock order without Playing Now", () => {
    render(
      <ProgramViewer>
        <div>content</div>
      </ProgramViewer>
    );

    expect(screen.queryByText("For Educators")).not.toBeInTheDocument();
    expect(document.getElementById("subscribe")).not.toBeInTheDocument();
    expect(screen.queryByText("HEC-TV NewsLetter")).not.toBeInTheDocument();
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
    expect(screen.getByText("HEC-TV SPOTLIGHT")).toBeInTheDocument();
    expect(screen.queryByText("Playing Now")).toBeNull();

    const railText = screen
      .getByText("Trending Now")
      .closest(".side-navigation").textContent;
    expect(railText.indexOf("Trending Now")).toBeLessThan(
      railText.indexOf("HEC-TV SPOTLIGHT")
    );
  });
});
