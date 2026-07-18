import React from "react";
import { render, screen } from "@testing-library/react";
import ListOfFeaturedPosts from "./index";

jest.mock("react-lazyload", () => ({ children }) => <>{children}</>);

describe("ListOfFeaturedPosts", () => {
  it("labels the existing Spotlight route as For Educators", () => {
    render(<ListOfFeaturedPosts spotLightPosts={[]} />);

    const link = screen.getByRole("link", { name: "For Educators" });
    expect(link).toHaveAttribute("href", "/spotlight");
    expect(screen.queryByText("HEC-TV Spotlight")).not.toBeInTheDocument();
  });
});
