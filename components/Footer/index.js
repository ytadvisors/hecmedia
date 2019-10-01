import React from "react";
import Link from "next/link";
import _ from "lodash";
import { getSocialMenuObject, getHref } from "../../lib/getFunctions";
import SocialLinks from "../SocialLinks";

import "./styles.scss";

export default props => {
  const { footer, social } = props;
  const { node: { menuItems: { edges: footerList = [] } = {} } = {} } = footer
    ? footer.edges[0]
    : {};
  const { node: { menuItems: { edges: socialList = [] } = {} } = {} } = social
    ? social.edges[0]
    : {};

  const links = _.chunk(footerList, footerList.length / 2);
  const linkMap = links.map((obj, x) => ({
    id: x,
    obj
  }));
  const largeSocialLinks = getSocialMenuObject(socialList, 30, "white");
  const socialLinks = getSocialMenuObject(socialList, 25, "white");
  const logo = "/static/assets/white_hec.png";

  return (
    <section className="footer">
      <div className="container">
        <div className="row">
          <div className="text-center mobile">
            <div className="social-container">
              <SocialLinks links={largeSocialLinks} />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xs-3 no-mobile">
            <div className="logo">
              <img src={logo} className="img-responsive" alt="logo" />
            </div>
            <div className="">
              <div className="social-container">
                <SocialLinks links={socialLinks} />
              </div>
            </div>
          </div>
          {linkMap.map(pageLinks => (
            <div key={pageLinks.id} className="col-xs-6 col-sm-3 no-padding">
              <ul>
                {pageLinks.obj.map(link => {
                  const url = link.node.url.replace(/https?:\/\/[^/]+/, "");
                  return (
                    <li key={link.node.url}>
                      {url === "/" && <a href={url}>{link.node.label}</a>}
                      {url !== "/" && (
                        <Link href={getHref(url)} as={url}>
                          <a>{link.node.label}</a>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
