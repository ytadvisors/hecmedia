import React from "react";
import { render, screen } from "@testing-library/react";
import ProgramViewer from "./index";

jest.mock("@apollo/react-hooks", () => ({
  useQuery: () => ({ data: {} })
}));

describe("ProgramViewer", () => {
  it("keeps page content before the rail by default", () => {
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
    expect(main.closest(".program-viewer")).toHaveClass("program-viewer");
  });

  it("marks feed pages to prioritize rail content around the feed on mobile", () => {
    render(
      <ProgramViewer
        railFirstOnMobile
        railPromo={{
          url: "/educators",
          alt: "For Educators",
          image: { sourceUrl: "/for-educators.jpg" }
        }}
      >
        <div>feed</div>
      </ProgramViewer>
    );

    expect(
      screen.getByRole("img", { name: "For Educators" })
    ).toBeInTheDocument();
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
    expect(screen.getByText("Spotlight STL")).toBeInTheDocument();
    expect(screen.getByText("feed").closest(".program-viewer-row")).toHaveClass(
      "program-viewer-row--rail-first-mobile"
    );
  });
});
