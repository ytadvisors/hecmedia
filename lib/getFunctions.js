import React from "react";
import {
  FaFacebook,
  FaTwitter,
  FaYoutubeSquare,
  FaInstagram,
  FaCaretDown
} from "react-icons/fa";
import moment from "moment";
import _ from "lodash";
import routeList from "../route-list.json";
import getPublicMediaUrl from "./mediaUrl";

export const getHref = (link, index) => {
  if (link) {
    const linkArray = link.split("/").filter(n => n);
    let numParams = linkArray.length - 2;
    if (numParams < 0) numParams = 0;

    if (linkArray.length > 0) {
      const key = linkArray[0];
      const routeDetails = routeList && routeList[key];
      if (routeDetails && routeDetails.length > 0) {
        if (routeDetails[index || numParams])
          return `/${routeDetails[index || numParams].page}`;
        return `/${routeDetails[0].page}`;
      }
    }
    return `/${routeList[""][0].page}`;
  }
  return "";
};

export const getSocialIcon = (title, size, color) => {
  switch (title.toLowerCase()) {
    case "facebook":
      return <FaFacebook size={size} color={color} />;
    case "twitter":
      return <FaTwitter size={size} color={color} />;
    case "youtube":
      return <FaYoutubeSquare size={size} color={color} />;
    case "instagram":
      return <FaInstagram size={size} color={color} />;
    default:
      return "";
  }
};
export const getExcerpt = (excerpt, length = 200) =>
  excerpt.length > length
    ? `${excerpt.replace(/<\/?[^>]+(>|$)/g, "").substring(0, length)}...`
    : excerpt.replace(/<\/?[^>]+(>|$)/g, "");

export const getNumAPIResults = response => {
  let numResults = 0;
  if (response.headers && response.headers["x-wp-total"])
    numResults = response.headers["x-wp-total"] / 1;
  return numResults;
};

export const getHeaderMenuObject = (menus, isRootLevel = true) =>
  menus
    ? menus
        // WPGraphQL's unscoped Menu.menuItems connection is flat. The query
        // requests roots, but retaining this guard prevents a malformed or
        // future unscoped response from rendering descendants twice.
        .filter(
          link =>
            !isRootLevel ||
            link.node.parentDatabaseId === undefined ||
            link.node.parentDatabaseId === 0
        )
        .map(link => ({
          label: link.node.label,
          url: link.node.url,
          icon: link.node.childItems &&
            link.node.childItems.edges.length > 0 && (
              <FaCaretDown className="default-icon" />
            ),
          children:
            link.node.childItems &&
            link.node.childItems.edges.length > 0 &&
            getHeaderMenuObject(link.node.childItems.edges, false),
          iconPlacement: "right"
        }))
    : [];

export const getSocialMenuObject = (menus, size, color) =>
  menus
    ? menus.map(link => ({
        label: link.node.label,
        link: link.node.url,
        icon: getSocialIcon(link.node.label, size, color)
      }))
    : [];

export const getPosts = (data, listIndex, postIndex, postName, extraIndex) => {
  let posts =
    (data[listIndex] &&
      data[listIndex].acf &&
      data[listIndex].acf[postIndex] &&
      data[listIndex].acf[postIndex].map(
        obj =>
          obj[postName] && {
            ...obj[postName],
            ...{ title: obj[postName].postTitle },
            ...{ excerpt: obj[postName].postExcerpt }
          }
      )) ||
    [];
  if (data[extraIndex])
    posts = [...posts, ...data[extraIndex].edges.map(obj => obj.node)];

  return posts.filter(n => n);
};

/**
 * Card/search/trending/related thumbnail source.
 * Never uses postHero — that field is main-post-page only so media crops
 * for the article header do not leak into list views.
 */
export const getPostImgSrc = (post, type) => {
  const {
    postDetails: { videoImage, postHeader } = {},
    eventDetails: { eventImage, externalImage = "" } = {},
    magazineDetail: { coverImage } = {}
  } = post || {};

  const featuredImage =
    post &&
    post.featuredImage &&
    (post.featuredImage.node || post.featuredImage);
  // Intentionally omit postHero (page-only).
  const currentImg = videoImage || postHeader || eventImage || coverImage;
  if (externalImage) return getPublicMediaUrl(externalImage);
  const currentImgSrc =
    type === "small"
      ? currentImg && currentImg.medium
      : currentImg && currentImg.large;
  if (currentImgSrc) return getPublicMediaUrl(currentImgSrc);
  return getPublicMediaUrl(featuredImage && featuredImage.sourceUrl);
};

/**
 * Main post page hero image. Prefers ACF post_hero (page-only), then the
 * shared video/header thumbnails, then featured image.
 */
export const getPostPageImgSrc = (post, type) => {
  const {
    postDetails: { postHero, videoImage, postHeader } = {},
    eventDetails: { eventImage, externalImage = "" } = {},
    magazineDetail: { coverImage } = {}
  } = post || {};

  const featuredImage =
    post &&
    post.featuredImage &&
    (post.featuredImage.node || post.featuredImage);
  const currentImg =
    postHero || videoImage || postHeader || eventImage || coverImage;
  if (externalImage) return getPublicMediaUrl(externalImage);
  const currentImgSrc =
    type === "small"
      ? currentImg && currentImg.medium
      : currentImg && currentImg.large;
  if (currentImgSrc) return getPublicMediaUrl(currentImgSrc);
  return getPublicMediaUrl(featuredImage && featuredImage.sourceUrl);
};

export const getEventDate = (eventDates, displayFormat = "MMM DD") => {
  let eDate = [];
  for (let x = 0; x < eventDates.length; x += 1) {
    const { startTime, endTime } = eventDates[x];
    const formattedStartTime = moment(startTime, "MM/DD/YYYY h:mm a", true);
    const formattedEndTime = moment(
      endTime || startTime,
      "MM/DD/YYYY h:mm a",
      true
    );

    // Add date prop
    if (!eDate || x === 0) eDate = [];
    if (formattedStartTime.isValid() && formattedEndTime.isValid()) {
      let format = displayFormat;
      if (formattedEndTime.get("month") < formattedStartTime.get("month"))
        format = `${displayFormat}, YYYY`;
      const startDate = formattedStartTime.format(format);
      const endDate = formattedEndTime.format(format);
      let dateFormat = ` ${startDate} - ${endDate}`;
      if (startDate === endDate) dateFormat = ` ${startDate}`;
      if (!_.includes(eDate, dateFormat)) eDate.push(dateFormat);
    }
  }
  return eDate;
};

export const getCurrentEvents = (currentDay, events, numEntries) =>
  events.reduce(
    (acc, item) => {
      const result = { ...acc };
      const {
        node: {
          slug,
          acf: { eventDates }
        }
      } = item;
      if (!numEntries || result.started < numEntries) {
        for (let x = 0; x < eventDates.length; x += 1) {
          const { startTime, endTime } = eventDates[x];
          const [start] = startTime ? startTime.split(" ") : [];
          const [end] = endTime ? endTime.split(" ") : [];
          const formattedStartTime = moment(
            `${start} 00:00 am`,
            "MM/DD/YYYY h:mm a"
          );
          const formattedEndTime = moment(
            `${end || start} 11:59 pm`,
            "MM/DD/YYYY h:mm a"
          );
          if (
            currentDay.isSameOrBefore(formattedEndTime) &&
            (!numEntries || result.started < numEntries) &&
            currentDay.isSameOrAfter(formattedStartTime)
          ) {
            result.values[slug] = item;
            result.started += 1;
          }
        }
      }
      return result;
    },
    { values: [], started: 0 }
  );

export const getCurrentPrograms = (programs, numEntries) => {
  const currentTime = moment(new Date());
  if (programs.length > 0)
    return programs.reduce(
      (acc, item) => {
        const result = { ...acc };
        if (result.started < numEntries) {
          const endTime = moment(
            new Date(`${item.programStartDate} ${item.programEndTime}`)
          );
          if (currentTime.isSameOrBefore(endTime) || result.started > 0) {
            result.values.push(item);
            result.started += 1;
          }
        }
        return result;
      },
      { values: [], started: 0 }
    );
  return {};
};

export const getPrograms = (schedules, numEntries) => {
  const currentTime = moment(new Date());
  const day = currentTime.format("MMMM-YYYY").toLowerCase();

  if (schedules) {
    const programs = schedules.reduce(
      (acc, schedule) =>
        schedule.node.slug === day ? schedule.node.acf.schedulePrograms : acc,
      []
    );
    return getCurrentPrograms(programs, numEntries);
  }
  return [];
};

export const getFormattedDate = newDate => {
  let dd = newDate.getDate();
  let mm = newDate.getMonth() + 1; // January is 0!
  const yyyy = newDate.getFullYear();

  if (dd < 10) {
    dd = `0${dd}`;
  }
  if (mm < 10) {
    mm = `0${mm}`;
  }
  return `${yyyy}-${mm}-${dd}`;
};
