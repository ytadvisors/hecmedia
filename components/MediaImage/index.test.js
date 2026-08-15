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
    expect(image).toHaveAttribute("width", "768");
    expect(image).toHaveAttribute("height", "430");
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

  it("keeps the active fallback across parent renders", () => {
    const props = {
      src: "https://media.example.com/story.jpg",
      fallbackSrc: "https://wordpress.example.com/story.jpg",
      finalSrc: "/static/assets/nothumbnail.png",
      alt: "Persistent story"
    };
    const { getByAltText, rerender } = render(<MediaImage {...props} />);
    const image = getByAltText("Persistent story");

    fireEvent.error(image);
    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/story.jpg"
    );

    rerender(<MediaImage {...props} className="parent-updated" />);

    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/story.jpg"
    );
    expect(image).toHaveClass("parent-updated");
  });

  it("resets to the primary source when the candidate chain changes", () => {
    const { getByAltText, rerender } = render(
      <MediaImage
        src="https://media.example.com/old.jpg"
        fallbackSrc="https://wordpress.example.com/old.jpg"
        alt="Changing story"
      />
    );
    const image = getByAltText("Changing story");

    fireEvent.error(image);
    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/old.jpg"
    );

    rerender(
      <MediaImage
        src="https://media.example.com/new.jpg"
        fallbackSrc="https://wordpress.example.com/new.jpg"
        alt="Changing story"
      />
    );

    expect(image).toHaveAttribute("src", "https://media.example.com/new.jpg");
    expect(image).toHaveAttribute("data-media-candidate-index", "0");

    fireEvent.error(image);
    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/new.jpg"
    );
    expect(image).toHaveAttribute("data-media-candidate-index", "1");
  });

  it("clears srcSet and sizes after the primary responsive image fails", () => {
    const { getByAltText } = render(
      <MediaImage
        src="https://media.example.com/story.jpg"
        srcSet="https://media.example.com/story-400.jpg 400w, https://media.example.com/story-800.jpg 800w"
        sizes="(max-width: 768px) 100vw, 768px"
        fallbackSrc="https://wordpress.example.com/story.jpg"
        finalSrc="/static/assets/nothumbnail.png"
        alt="Responsive story"
      />
    );
    const image = getByAltText("Responsive story");

    expect(image).toHaveAttribute("src", "https://media.example.com/story.jpg");
    expect(image).toHaveAttribute(
      "srcSet",
      "https://media.example.com/story-400.jpg 400w, https://media.example.com/story-800.jpg 800w"
    );
    expect(image).toHaveAttribute("sizes", "(max-width: 768px) 100vw, 768px");
    expect(image).toHaveAttribute("data-media-candidate-index", "0");

    fireEvent.error(image);

    expect(image).toHaveAttribute(
      "src",
      "https://wordpress.example.com/story.jpg"
    );
    expect(image).not.toHaveAttribute("srcSet");
    expect(image).not.toHaveAttribute("sizes");
    expect(image).toHaveAttribute("data-media-candidate-index", "1");

    fireEvent.error(image);

    expect(image).toHaveAttribute("src", "/static/assets/nothumbnail.png");
    expect(image).not.toHaveAttribute("srcSet");
    expect(image).not.toHaveAttribute("sizes");
    expect(image).toHaveAttribute("data-media-candidate-index", "2");
  });
});
