import Router from "next/router";
import redirect from "./redirect";

jest.mock("next/router", () => ({ replace: jest.fn() }));

describe("redirect", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("issues a 303 server redirect when a response object is present", () => {
    const end = jest.fn();
    const writeHead = jest.fn();
    const context = { res: { writeHead, end } };

    redirect(context, "/target-page");

    expect(writeHead).toHaveBeenCalledWith(303, { Location: "/target-page" });
    expect(end).toHaveBeenCalled();
    expect(Router.replace).not.toHaveBeenCalled();
  });

  it("falls back to a client-side router replace with no response object", () => {
    redirect({}, "/client-target");

    expect(Router.replace).toHaveBeenCalledWith("/client-target");
  });
});
