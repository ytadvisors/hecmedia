import React from "react";

/**
 * Render an image with an ordered, finite fallback chain. The index lives on
 * React state so parent renders cannot restore a source that already failed.
 */
const MediaImage = ({
  src,
  fallbackSrc,
  finalSrc,
  alt = "",
  onError,
  width = 768,
  height = 430,
  ...imageProps
}) => {
  const candidates = React.useMemo(
    () => [...new Set([src, fallbackSrc, finalSrc].filter(Boolean))],
    [src, fallbackSrc, finalSrc]
  );
  const candidateKey = candidates.join("\u0000");
  const [candidateState, setCandidateState] = React.useState({
    key: candidateKey,
    index: 0
  });
  const candidateIndex =
    candidateState.key === candidateKey ? candidateState.index : 0;

  const handleError = event => {
    setCandidateState(current => {
      const currentIndex = current.key === candidateKey ? current.index : 0;
      if (currentIndex >= candidates.length - 1) {
        return current.key === candidateKey
          ? current
          : { key: candidateKey, index: currentIndex };
      }
      return { key: candidateKey, index: currentIndex + 1 };
    });

    if (onError) onError(event);
  };

  return (
    <img
      {...imageProps}
      src={candidates[candidateIndex]}
      alt={alt}
      width={width}
      height={height}
      style={{
        aspectRatio: `${width} / ${height}`,
        ...(imageProps.style || {})
      }}
      data-media-candidate-index={candidateIndex}
      onError={handleError}
    />
  );
};

export default MediaImage;
