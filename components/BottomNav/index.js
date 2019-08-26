import React from "react";
import Link from "next/link";
import PropTypes from "prop-types";

import "./styles.scss";

const BottomNav = ({ menus, title }) => (
  <section className="post-bottom-nav">
    <div className="row">
      <div className="col-md-12">
        {
          <ul>
            <li className="title">{title}</li>
            {menus.map(menu => (
              <li key={menu.url}>
                <Link href={menu.url.replace(/https?:\/\/[^/]+/, "")}>
                  {menu.title}
                </Link>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  </section>
);

BottomNav.propTypes = {
  menus: PropTypes.arrayOf(PropTypes.object).isRequired,
  title: PropTypes.string.isRequired
};

export default BottomNav;
