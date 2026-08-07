import React, { useEffect } from "react";
import moment from "moment";
import { useQuery } from "@apollo/react-hooks";
import $ from "jquery";
import * as Material from "react-icons/md";
import LazyLoad from "react-lazyload";
import VideoPlayer from "../VideoPlayer/index";
import ShareSocialLinks from "../ShareSocialLinks";
import { getEventDate, getPostPageImgSrc } from "../../lib/getFunctions";
import { cleanUrl } from "../../lib/updateFunctions";
import { isServer } from "../../lib/serverFunctions";
import { GET_PAGE_INFO, GET_POST_HEADER_IMAGE_SIZE } from "../../lib/graphql";
import PodcastLinks from "../PodcastLinks";
import { modernWpGraphqlEnabled } from "../../lib/stagingCompatibility";
import { rewritePublicMediaHtml } from "../../lib/mediaUrl";

const HEADER_IMAGE_SIZES = new Set(["small", "medium", "large", "full"]);

export const resolveHeaderImageSize = data => {
  const value = data && data.post && data.post.headerImageSize;
  return HEADER_IMAGE_SIZES.has(value) ? value : "full";
};

const SinglePost = props => {
  const {
    post,
    showShareIcons,
    playingLive,
    hideTitle,
    classes,
    podcasts
  } = props;

  const { slug, postDetails: { pollForUpdates } = {} } = post || {};

  const variables = { slug };

  const { data: headerImageData } = useQuery(GET_POST_HEADER_IMAGE_SIZE, {
    variables,
    skip: !slug || !modernWpGraphqlEnabled(),
    errorPolicy: "all"
  });

  const { data } =
    pollForUpdates && pollForUpdates !== 0
      ? useQuery(GET_PAGE_INFO, {
          variables,
          notifyOnNetworkStatusChange: true,
          pollInterval: pollForUpdates * 1000
        })
      : {};

  const { updatedPost } = data || {};
  const currentPost = { ...post, updatedPost };

  const { title, content, link = "", postDetails, eventDetails } =
    currentPost || {};
  const headerImageSize = resolveHeaderImageSize(headerImageData);

  const {
    youtubeId,
    showPodcasts,
    vimeoId,
    embedUrl,
    venue,
    eventDates,
    webAddress,
    eventPrice,
    hidePageThumbnail
  } = postDetails || eventDetails || {};

  const resizeVideos = () => {
    const isMobile = !isServer && $(window).width() <= 1170;
    if (isMobile) {
      $(`.blog-content iframe`).each(function() {
        const src = $(this).attr("src");
        if (src.match(/youtube\.com/g)) {
          let width = $(window).width();
          $(this).attr("width", Math.floor((width -= width * 0.32)));
          $(this).attr("height", Math.floor(width / 2));
        }
      });
    } else {
      $(`.blog-content iframe`).each(function() {
        const src = $(this).attr("src");
        if (src.match(/youtube\.com/g)) {
          const width = 1000;
          $(this).attr("width", width - 170);
          $(this).attr("height", Math.floor(width / 2));
        }
      });
    }
  };

  useEffect(() => {
    /* eslint-disable global-require */
    require("slick-carousel/slick/slick"); // required here for build to work

    $(".gallery-columns-3 br").remove();
    $(".gallery-columns-3").slick({
      dots: false,
      pauseOnHover: false,
      swipe: false,
      swipeToSlide: false,
      touchMove: false,
      arrows: true,
      fade: false,
      autoplay: true,
      infinite: true,
      slidesToScroll: 1,
      autoplaySpeed: 4000,
      slidesToShow: 3,
      responsive: [
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 1
          }
        }
      ]
    });

    resizeVideos();
    window.addEventListener("resize", resizeVideos);

    return () => {
      window.removeEventListener("resize", resizeVideos, false);
    };
  }, []);

  const containerStyle = { padding: "0" };
  const { temporaryLink: { displayDate, endDate, url } = {} } =
    playingLive || {};

  const isPlaying =
    displayDate &&
    moment().isBetween(
      moment(displayDate, "YYYY-MM-DD hh:mm:ss", true),
      moment(endDate, "YYYY-MM-DD hh:mm:ss", true)
    );

  const imgThumbnail =
    !hidePageThumbnail && currentPost && getPostPageImgSrc(currentPost);
  const isLiveVideo =
    isPlaying &&
    url &&
    cleanUrl(url.replace(/\/$/, "")) === cleanUrl(link.replace(/\/$/, ""));

  const shareUrl = process.env.SITE_HOST + cleanUrl(link.replace(/\/$/, ""));

  const liveEmbedUrl = isLiveVideo && embedUrl;
  const singleEmbedUrl = !youtubeId && !vimeoId && embedUrl;

  return (
    <section className="post-container" id="post-container">
      <div className="col-md-12 no-padding">
        {!hideTitle && <h2 dangerouslySetInnerHTML={{ __html: title }} />}

        {showShareIcons && (
          <div className="row share-container">
            {link && <ShareSocialLinks url={shareUrl} title={title} />}
          </div>
        )}
        <ul className="post-details">
          {venue && (
            <li>
              <Material.MdLocationOn
                size="25"
                color="#4ea2ea"
                style={{ verticalAlign: "middle" }}
              />
              <span dangerouslySetInnerHTML={{ __html: venue }} />
            </li>
          )}
          {webAddress && (
            <li>
              <span>
                <a href={webAddress} target="_blank" rel="noopener noreferrer">
                  {webAddress}
                </a>
              </span>
            </li>
          )}
          {eventDates &&
            getEventDate(eventDates, "MMM D, hh:mm a", true).map(event => (
              <li key={event}>
                <span
                  dangerouslySetInnerHTML={{
                    __html: event
                  }}
                />
              </li>
            ))}
          {eventPrice && (
            <li>
              <span>Price: {eventPrice}</span>
            </li>
          )}
        </ul>
      </div>
      {youtubeId || vimeoId || embedUrl ? (
        <div className={`video-post ${(classes && classes.video) || ""}`}>
          <VideoPlayer
            url={
              youtubeId
                ? `https://youtu.be/${youtubeId}`
                : `https://vimeo.com/${vimeoId}`
            }
            containerStyle={containerStyle}
            embedUrl={singleEmbedUrl || liveEmbedUrl}
          />
        </div>
      ) : (
        <div
          className={`blog-image article-header-image ${(classes &&
            classes.thumbnail) ||
            "default-img"}`}
          data-header-image-size={headerImageSize}
        >
          {imgThumbnail && (
            <LazyLoad height={500}>
              <img
                src={imgThumbnail}
                className="img-responsive blog-thumbnail"
                alt="thumbnail"
              />
            </LazyLoad>
          )}
        </div>
      )}
      {showPodcasts && <PodcastLinks podcasts={podcasts} />}
      <div
        className={`blog-content ${(classes && classes.content) || ""}`}
        data-media-verification="article-content"
      >
        <div
          dangerouslySetInnerHTML={{ __html: rewritePublicMediaHtml(content) }}
        />
      </div>
    </section>
  );
};

export default SinglePost;
