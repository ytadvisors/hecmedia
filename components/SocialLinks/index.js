import React from "react";
import PropTypes from "prop-types";
import "./styles.scss";

const SocialLinks = ({ links }) => (
  <ul className="social-links">
    {links.map(social => (
      <li key={social.link}>
        <a href={social.link} target="_blank" rel="noopener noreferrer">
          {social.icon}
        </a>
      </li>
    ))}
  </ul>
);

SocialLinks.propTypes = {
  links: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default SocialLinks;
