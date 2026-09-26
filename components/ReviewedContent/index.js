import React, { useEffect, useRef } from "react";
import { rewritePublicMediaHtml } from "../../lib/mediaUrl";
import { executeReviewedContentScripts } from "../../lib/reviewedContentScripts";

const ReviewedContent = ({ as: Tag = "span", content, ...props }) => {
  const root = useRef(null);
  const renderedContent = rewritePublicMediaHtml(content);

  useEffect(() => {
    executeReviewedContentScripts(root.current).catch(error => {
      // Keep the page usable if an approved third-party script is unavailable.
      // eslint-disable-next-line no-console
      console.error(error);
    });
  }, [renderedContent]);

  return (
    <Tag
      {...props}
      ref={root}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
};

export default ReviewedContent;
