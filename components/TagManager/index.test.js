import React from "react";
import { render } from "@testing-library/react";
import TagManager from ".";

describe("TagManager", () => {
  const originalId = process.env.GA_TAGMANAGER_ID;

  afterEach(() => {
    if (originalId === undefined) delete process.env.GA_TAGMANAGER_ID;
    else process.env.GA_TAGMANAGER_ID = originalId;
  });

  it("does not request an undefined Google Tag Manager container", () => {
    delete process.env.GA_TAGMANAGER_ID;

    const { container } = render(<TagManager />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the configured container id", () => {
    process.env.GA_TAGMANAGER_ID = "GTM-TEST";

    const { container } = render(<TagManager />);

    expect(container.innerHTML).toContain("GTM-TEST");
    expect(container.innerHTML).not.toContain("undefined");
  });
});
