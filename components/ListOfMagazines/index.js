import React from "react";
import LazyLoad from "react-lazyload";

import "./styles.scss";

export default ({ featuredMagazines }) => (
  <section className="list-of-magazines">
    <div className="title">
      <div>
        <b>
          <a href="/magazines">HEC-TV Magazine</a>
        </b>
      </div>
    </div>
    <ul className="magazine-list">
      {featuredMagazines &&
        featuredMagazines.edges.map(
          ({
            node: {
              title,
              link,
              magazineDetail: {
                coverImage: { sourceUrl }
              }
            }
          }) => {
            const url = link.replace(/https?:\/\/[^/]+/, "");

            return (
              <li key={link}>
                <a href={url}>
                  <div className="row">
                    <div className="magazine-img col-xs-4 ">
                      <LazyLoad height={150}>
                        <img
                          src={sourceUrl.replace(/^https?:\/\//, "https://")}
                          className="img-responsive"
                          alt="cover"
                        />
                      </LazyLoad>
                    </div>
                    <div
                      className="magazine-info col-xs-8"
                      dangerouslySetInnerHTML={{ __html: title }}
                    />
                  </div>
                </a>
              </li>
            );
          }
        )}
    </ul>
  </section>
);
