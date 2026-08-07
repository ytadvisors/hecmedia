import React from "react";
import { fireEvent, render } from "@testing-library/react";
import MediaImage from "./index";

describe("MediaImage", () => {
  it("tries WordPress and then the local placeholder without looping", () => {
    const { getByAltText } = render(
      <MediaImage
        src="https://media.example.com/story.jpg"
        fallbackSrc="https://wordpress.example.com/story.jpg"
        finalSrc="/static/assets/nothumbnail.png"
        alt="Story"
      />
    );
    const image = getByAltText("Story");

    expect(image).toHaveAttribute("src", "https://media.example.com/story.jpg");
    fireEvent.error(image);
    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/story.jpg"
    );
    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/static/assets/nothumbnail.png");
    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/static/assets/nothumbnail.png");
  });

  it("deduplicates candidates", () => {
    const { getByAltText } = render(
      <MediaImage
        src="/static/assets/nothumbnail.png"
        fallbackSrc="/static/assets/nothumbnail.png"
        finalSrc="/static/assets/nothumbnail.png"
        alt="Fallback"
      />
    );
    const image = getByAltText("Fallback");

    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/static/assets/nothumbnail.png");
    expect(image).toHaveAttribute("data-media-candidate-index", "0");
  });
});
