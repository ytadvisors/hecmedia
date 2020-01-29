import React from "react";
import LazyLoad from "react-lazyload";

import { getPostImgSrc } from "../../lib/getFunctions";
import "./styles.scss";

export default props => {
  const { spotLightPosts } = props;
  return (
    <section className="list-of-featured-posts">
      <div className="title">
        <div>
          <b>
            <a href="/magazines">HEC-TV Spotlight</a>
          </b>
        </div>
      </div>
      <ul className="magazine-list">
        {spotLightPosts.map(entry => {
          const { title, link } = entry;
          const img = getPostImgSrc(entry);
          const url = link.replace(/https?:\/\/[^/]+/, "");

          return (
            <li key={link}>
              <a href={url}>
                <div className="row">
                  <div className="magazine-img col-xs-4 no-padding">
                    <LazyLoad height={50}>
                      <img
                        src={img.replace(/^https?:\/\//, "https://")}
                        className="img-responsive"
                        alt="cover"
                      />
                    </LazyLoad>
                  </div>
                  <div
                    className="magazine-info col-xs-8 no-padding"
                    style={{ paddingLeft: "1em" }}
                    dangerouslySetInnerHTML={{ __html: title }}
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
