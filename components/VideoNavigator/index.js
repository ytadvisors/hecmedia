import React from "react";
import _ from "lodash";
import Link from "next/link";
import { Button } from "react-bootstrap";
import CommentForm from "../Forms/CommentForm";

export default ({
  tabs,
  callbackFunc,
  selected,
  page,
  currentNavigationTab,
  changeNavigationTab
} = {}) => {
  const truncateFunc = (excerpt, truncateLength) =>
    excerpt.length > truncateLength
      ? `${excerpt.substr(0, truncateLength - 1)}&hellip;`
      : excerpt;

  const getContent = (navSelection, entry, counter = 0) => {
    const defaultImage = "/static/assets/nothumbnail.png";
    let x = counter;
    if (Array.isArray(entry)) {
      x += 1;
      return entry.map(newEntry => getContent(navSelection, newEntry, x));
    }
    const { thumbnailClass, contentclass, truncate } = navSelection;
    const { thumbnail, title, author } = entry;
    return (
      <div key={`${title}-${x}`} className={`tab-${x}`}>
        <div className={thumbnailClass}>
          <img src={thumbnail || defaultImage} alt="Entry thumbnail" />
        </div>
        <div className={contentclass}>
          <div className="author-name">{author}</div>
          <div
            className="title"
            dangerouslySetInnerHTML={{
              __html: truncate ? truncateFunc(title, 55) : title
            }}
          />
        </div>
      </div>
    );
  };

  const getNavSection = (navSelection, isLink) => {
    const numEntries = navSelection.entries.length;
    const { numResults, loadMore } = navSelection;
    if (numEntries > 0 && numEntries < numResults) {
      return (
        <div>
          <div className="row result-count pull-right">
            {isLink ? `${numEntries} of ${numResults} Results` : ""}
          </div>
          <div className="row load-more-container">
            <Button
              className="btn btn-secondary btn-load-more"
              onClick={loadMore}
            >
              {" "}
              Load More
            </Button>
          </div>
        </div>
      );
    }
    return "";
  };

  if (currentNavigationTab && tabs[currentNavigationTab]) {
    const navSelection = tabs[currentNavigationTab];
    const navigationLinks = _.keys(tabs);
    const { isLink } = navSelection;

    return (
      <section className="video-navigator row">
        <div className="row">
          <div className="navigator-tabs pull-right">
            {navigationLinks.map(title => (
              <Button
                key={title}
                onClick={() => changeNavigationTab(title)}
                className={currentNavigationTab === title ? "active" : ""}
              >
                {title}
              </Button>
            ))}
          </div>
        </div>
        {navSelection.editor ? <CommentForm callbackFunc={callbackFunc} /> : ""}
        <div className="row navigator-container">
          <div className="col-md-12 ">
            <ul className="entry-list">
              {navSelection.groupedEntries.map(entry => {
                const { slug } = entry;
                if (isLink) {
                  return (
                    <li
                      key={slug}
                      className={`${selected}` === `${slug}` ? "active" : " "}
                    >
                      <Link href={`/${page}/${slug}`}>
                        {getContent(navSelection, entry)}
                      </Link>
                    </li>
                  );
                }
                return <li key={slug}>{getContent(navSelection, entry)}</li>;
              })}
            </ul>
            {getNavSection(navSelection, isLink)}
          </div>
        </div>
      </section>
    );
  }
  return <section className="video-navigator row" />;
};
