import React from "react";
import PropTypes from "prop-types";

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
