import React from "react";
import PropTypes from "prop-types";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterIcon,
  EmailIcon,
  TwitterShareButton,
  EmailShareButton
} from "react-share";

const ShareSocialLinks = ({ url, title }) => (
  <section className="share-social-links">
    <ul>
      <li>
        <FacebookShareButton url={url} quote={title} className="">
          <FacebookIcon size={38} round />
        </FacebookShareButton>
      </li>
      <li>
        <TwitterShareButton url={url} title={title} className="">
          <TwitterIcon size={38} round />
        </TwitterShareButton>
      </li>
      <li>
        <EmailShareButton
          url={url}
          subject={title}
          body={`${title} at ${url}`}
          className=""
        >
          <EmailIcon size={38} round />
        </EmailShareButton>
      </li>
    </ul>
  </section>
);

ShareSocialLinks.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
};

export default ShareSocialLinks;
