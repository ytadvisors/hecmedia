import React from "react";
import { render, screen } from "@testing-library/react";
import ProgramViewer from "./index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: () => ({ data: {} })
}));

describe("ProgramViewer", () => {
  it("places page content before Trending Now and Spotlight on mobile", () => {
    render(
      <ProgramViewer>
        <div>content</div>
      </ProgramViewer>
    );

    expect(screen.queryByText("For Educators")).not.toBeInTheDocument();
    expect(document.getElementById("subscribe")).not.toBeInTheDocument();
    expect(screen.queryByText("HEC-TV NewsLetter")).not.toBeInTheDocument();
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
    expect(screen.getByText("Spotlight STL")).toBeInTheDocument();
    expect(screen.queryByText("Playing Now")).toBeNull();

    const railText = screen
      .getByText("Trending Now")
      .closest(".side-navigation").textContent;
    expect(railText.indexOf("Trending Now")).toBeLessThan(
      railText.indexOf("Spotlight STL")
    );

    const main = screen.getByText("content").closest(".program-viewer-main");
    const rail = screen
      .getByText("Trending Now")
      .closest(".program-viewer-rail");
    expect(main).toBeInTheDocument();
    expect(rail).toBeInTheDocument();
    expect(main.nextElementSibling).toBe(rail);
    expect(main.closest(".program-viewer")).not.toHaveClass(
      "mobile-rail-first"
    );
  });
});
