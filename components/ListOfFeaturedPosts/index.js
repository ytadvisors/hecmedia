import React from "react";
import { getPostImgSrc } from "../../lib/getFunctions";
import { getWordPressMediaFallbackUrl } from "../../lib/mediaUrl";
import MediaImage from "../MediaImage";

const fallbackThumbnail = "/static/assets/nothumbnail.png";

export default props => {
  const {
    spotLightPosts = [],
    title = "FOR EDUCATORS",
    titleHref = "/spotlight",
    maxItems
  } = props;
  const entries = maxItems ? spotLightPosts.slice(0, maxItems) : spotLightPosts;
  return (
    <section className="list-of-featured-posts">
      <div className="title">
        <div>
          <b>{titleHref ? <a href={titleHref}>{title}</a> : title}</b>
        </div>
      </div>
      <ul className="magazine-list">
        {entries.map(entry => {
          const { title: entryTitle, link } = entry;
          const img = getPostImgSrc(entry);
          const source = img && img.replace(/^https?:\/\//, "https://");
          const url = link.replace(/https?:\/\/[^/]+/, "");

          return (
            <li key={link}>
              <a href={url}>
                <div className="row">
                  <div className="magazine-img col-xs-5 no-padding">
                    <MediaImage
                      src={source}
                      fallbackSrc={getWordPressMediaFallbackUrl(source)}
                      finalSrc={fallbackThumbnail}
                      className="img-responsive"
                      alt="cover"
                      loading="lazy"
                    />
                  </div>
                  <div
                    className="magazine-info col-xs-7 no-padding"
                    style={{ paddingLeft: "1em" }}
                    dangerouslySetInnerHTML={{ __html: entryTitle }}
                  />
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
