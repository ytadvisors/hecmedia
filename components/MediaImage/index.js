import React from "react";

/**
 * Render an image with an ordered, finite fallback chain. The index lives on
 * the DOM node so a failed fallback cannot loop forever through React's image
 * error event.
 */
const MediaImage = ({
  src,
  fallbackSrc,
  finalSrc,
  alt = "",
  onError,
  ...imageProps
}) => {
  const candidates = [...new Set([src, fallbackSrc, finalSrc].filter(Boolean))];

  const handleError = event => {
    const image = event.currentTarget;
    const currentIndex = Number(
      image.getAttribute("data-media-candidate-index") || "0"
    );
    const nextSrc = candidates[currentIndex + 1];

    if (nextSrc) {
      image.setAttribute(
        "data-media-candidate-index",
        String(currentIndex + 1)
      );
      image.setAttribute("src", nextSrc);
    }

    if (onError) onError(event);
  };

  return (
    <img
      {...imageProps}
      src={candidates[0]}
      alt={alt}
      data-media-candidate-index="0"
      onError={handleError}
    />
  );
};

export default MediaImage;
