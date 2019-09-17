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

export const getHref = link => {
  const linkArray = link.split("/").filter(n => n);
  if (linkArray.length > 0) {
    const key = linkArray[0];
    const routeDetails = routeList && routeList[key];
    if (routeDetails) {
      return routeDetails.page;
    }
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

export const getNumAPIResults = response => {
  let numResults = 0;
  if (response.headers && response.headers["x-wp-total"])
    numResults = response.headers["x-wp-total"] / 1;
  return numResults;
};

export const getHeaderMenuObject = menus =>
  menus
    ? menus.map(link => ({
        label: link.node.label,
        url: link.node.url,
        icon: link.node.childItems && link.node.childItems.edges.length > 0 && (
          <FaCaretDown className="default-icon" />
        ),
        children:
          link.node.childItems &&
          link.node.childItems.edges.length > 0 &&
          getHeaderMenuObject(link.node.childItems.edges),
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

export const getFirstImageFromWpList = posts => {
  let image = "";
  if (posts.length > 0 && posts[0].acf) {
    const imgContainer = posts[0].acf.videoImage || posts[0].acf.postHeader;
    if (imgContainer)
      image =
        imgContainer && imgContainer.sizes ? imgContainer.sizes.medium : "";
    else {
      image = posts[0].coverImage || posts[0].thumbnail;
    }
  }
  return image;
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
