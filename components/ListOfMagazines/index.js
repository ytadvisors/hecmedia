import React from "react";
import { graphql } from "react-apollo";
import Link from "next/link";
import gql from "graphql-tag";
import LazyLoad from "react-lazyload";
import { getHref } from "../../lib/getFunctions";

import "./styles.scss";

export const ListOfMagazines = ({ data: { magazines } }) => (
  <section className="list-of-magazines">
    <div className="title">
      <div>
        <b>
          <Link href="/magazines">
            <a>HEC-TV Magazine</a>
          </Link>
        </b>
      </div>
    </div>
    <ul className="magazine-list">
      {magazines &&
        magazines.edges.map(
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
                <Link href={getHref(url)} as={url}>
                  <a>
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
                </Link>
              </li>
            );
          }
        )}
    </ul>
  </section>
);

export const allMagazines = gql`
  query allMagazines {
    magazines(first: 5, where: { orderby: { field: DATE, order: DESC } }) {
      edges {
        node {
          title
          link
          magazineDetail {
            coverImage {
              sourceUrl(size: MEDIUM)
            }
          }
        }
      }
    }
  }
`;

export default graphql(allMagazines)(ListOfMagazines);
