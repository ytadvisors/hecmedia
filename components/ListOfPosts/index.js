import React, { Component } from "react";
import _ from "lodash";
import { Button } from "react-bootstrap";
import { MdLocationOn } from "react-icons/md";
import { IoIosCalendar } from "react-icons/io";
import LazyLoad from "react-lazyload";
import NewsLetterContainer from "../../containers/NewsLetterContainer";
import { getEventDate, getPostImgSrc } from "../../lib/getFunctions";

import "./styles.scss";

const defaultImage = "/static/assets/nothumbnail.png";
const playButton = "/static/assets/play-button.png";

export default class ListOfPosts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isMobile: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.resize();
    window.addEventListener("resize", this.resize);
    this.setState({ isMobile: window.innerWidth <= 500 });
  }

  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener("resize", this.resize);
  }

  resize = () => {
    if (this.mounted) {
      this.setState({ isMobile: window.innerWidth <= 500 });
    }
  };

  truncate = (excerpt, truncateLength) =>
    excerpt && excerpt.length > truncateLength
      ? `${excerpt.substr(0, truncateLength)}&hellip;`
      : excerpt;

  getThumbNail = (thumbnail, isVideo = false, link) => (
    <a href={link} className="thumbnail-link">
      {isVideo && <img src={playButton} className="play-icon" alt="play" />}
      <LazyLoad height={200}>
        <img
          src={thumbnail || defaultImage}
          className="img-responsive full-width thumbnail-img"
          alt=""
        />
      </LazyLoad>
    </a>
  );

  getLink = post => {
    const { link: { page } = {} } = this.props;
    const { slug, redirect } = post;
    return redirect || slug ? `/${page}/${slug}` : `/${page}/${slug}`;
  };

  getCategoryHelper = category => {
    if (category.node.link) {
      const url = category.node.link.replace(/https?:\/\/[^/]+/, "");
      return (
        <a href={url}>
          <span
            dangerouslySetInnerHTML={{
              __html: category.node.name
            }}
          />
        </a>
      );
    }
    return "";
  };

  getCategories = categoryArray =>
    categoryArray &&
    categoryArray.edges &&
    categoryArray.edges.map(category => (
      <span className="category-info" key={category.node.link}>
        {this.getCategoryHelper(category)}
        {this.getCategories(category.node.children)}
      </span>
    ));

  getTitle = (displayType, layout, post) => {
    const { title } = post;
    const link = this.getLink(post);
    const postType = layout === "3 Columns" ? "small_title" : "";
    if (displayType === "Wallpaper") {
      return (
        <p>
          <span
            className={`blog-title ${postType}`}
            dangerouslySetInnerHTML={{
              __html: title
            }}
          />
        </p>
      );
    }
    return (
      <p>
        <a href={link}>
          <span
            className={`blog-title ${postType}`}
            dangerouslySetInnerHTML={{
              __html: title
            }}
          />
        </a>
      </p>
    );
  };

  getExcerpt = (displayType, layout, post) => {
    const { excerpt, eventDetails: { venue } = {} } = post;
    let subtitle = excerpt;
    let icon = "";
    let alignClass = "";
    if (venue) {
      alignClass = "vertical-align-middle";
      subtitle = venue;
      icon = <MdLocationOn size="25" color="#4ea2ea" className={alignClass} />;
    }

    if (subtitle) {
      if (
        displayType === "Wallpaper" ||
        (layout !== "2 Columns" && layout !== "3 Columns")
      ) {
        return (
          <div>
            {icon}
            <span
              className={`blog-content ${alignClass}`}
              dangerouslySetInnerHTML={{
                __html: subtitle
              }}
            />
          </div>
        );
      }
    }
    return "";
  };

  getContentDetails = (displayType, layout, post) => {
    const { contentDetails } = post;
    if (contentDetails) {
      if (
        displayType === "Wallpaper" ||
        (layout !== "2 Columns" && layout !== "3 Columns")
      ) {
        return (
          <span
            className="content-details"
            dangerouslySetInnerHTML={{
              __html: ` ${this.truncate(contentDetails, 163)}`
            }}
          />
        );
      }
    }
    return "";
  };

  getContent = (displayType, layout, post) => (
    <div>
      {this.getExcerpt(displayType, layout, post)}
      {this.getContentDetails(displayType, layout, post)}
    </div>
  );

  getColumnContent = (displayType, layout, post) => {
    const { categories = [], eventDetails: { eventDates } = {} } = post;
    return (
      <div>
        {eventDates && (
          <div className="blog-meta">{this.getDate(eventDates)}</div>
        )}
        <div className="blog-excerpt">
          <p>{this.getCategories(categories)}</p>
          {this.getTitle(displayType, layout, post)}
          {this.getContent(displayType, layout, post)}
        </div>
      </div>
    );
  };

  getDate = eventDates => {
    if (eventDates) {
      return (
        <div className="blog-info">
          <IoIosCalendar size="20" color="white" className="calendar-icon" />
          <span
            className="date"
            dangerouslySetInnerHTML={{
              __html: getEventDate(eventDates)
            }}
          />
        </div>
      );
    }
    return "";
  };

  getSingleColumnPost = (post, content) => {
    const { postDetails } = post;

    const isVideo = postDetails && postDetails.isVideo;

    return (
      <table className="no-spacing">
        <tbody>
          <tr>
            <td className="col-xs-7">{content}</td>
            <td
              className="col-xs-5"
              style={{ padding: "10px", paddingBottom: "30px" }}
            >
              {this.getThumbNail(
                getPostImgSrc(post, "small"),
                isVideo,
                this.getLink(post)
              )}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  getSingleColumnWallpaper = (post, content) => (
    <table className="no-spacing">
      <tbody>
        <tr>
          <td className="col-md-12 wallpapercontainer">
            <div
              className="wallpaper"
              style={{
                backgroundImage: `url(${getPostImgSrc(post) || defaultImage})`
              }}
            >
              {(post.redirect && (
                <a
                  href={post.redirect}
                  style={{ display: "block" }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="gradient" />
                  <div className="texture" />
                  <div className="content">{content}</div>
                </a>
              )) || (
                <a href={this.getLink(post)}>
                  <span>
                    <div className="gradient" />
                    <div className="texture" />
                    <div className="content">{content}</div>
                  </span>
                </a>
              )}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );

  getFeaturedPost = (post, content) => {
    const { postDetails } = post;

    const isVideo = postDetails && postDetails.isVideo;

    const { isMobile } = this.state;

    return (
      <div className="featured-block">
        {this.getThumbNail(
          getPostImgSrc(post, isMobile ? "small" : ""),
          isVideo,
          this.getLink(post)
        )}
        {content}
      </div>
    );
  };

  getFeaturedWallpaper = (post, content) => {
    const { isMobile } = this.state;

    return (
      <div className="featured-block">
        <div
          className="wallpaper"
          style={{
            backgroundImage: `url(${getPostImgSrc(
              post,
              !isMobile ? "small" : ""
            )})`
          }}
        >
          <a href={this.getLink(post)}>
            <span>
              <div className="gradient" />
              <div className="texture" />
              <div className="content">{content}</div>
            </span>
          </a>
        </div>
      </div>
    );
  };

  getPost = (layout, post, content) => {
    const { postDetails } = post;

    const isVideo = postDetails && postDetails.isVideo;

    return (
      <div>
        <div className={`thumbnail-${layout.replace(" ", "-").toLowerCase()}`}>
          {this.getThumbNail(getPostImgSrc(post), isVideo, this.getLink(post))}
        </div>
        {content}
      </div>
    );
  };

  getWallpaper = (post, content) => (
    <div
      className="wallpaper"
      style={{ backgroundImage: `url(${getPostImgSrc(post)})` }}
    >
      <a href={this.getLink(post)}>
        <span>
          <div className="gradient" />
          <div className="texture" />
          <div className="content">{content}</div>
        </span>
      </a>
    </div>
  );

  getColumnLayout = (displayType, layout, post, numRows) => {
    const content = this.getColumnContent(displayType, layout, post);
    const { isMobile } = this.state;

    switch (layout) {
      case "Single Column":
        switch (displayType) {
          case "Post":
            return this.getSingleColumnPost(post, content);
          case "Wallpaper":
            return this.getSingleColumnWallpaper(post, content);
          default:
            return this.getSingleColumnPost(post, content);
        }
      case "Featured":
        switch (displayType) {
          case "Post":
            return this.getFeaturedPost(post, content, isMobile);
          case "Wallpaper":
            return this.getFeaturedWallpaper(post, content, isMobile);
          default:
            return this.getFeaturedPost(post, content, isMobile);
        }
      default:
        switch (displayType) {
          case "Post":
            return this.getPost(`${numRows}-columns`, post, content);
          case "Wallpaper":
            return this.getWallpaper(post, content);
          default:
            return this.getPost(`${numRows}-columns`, post, content);
        }
    }
  };

  getRowKey = currentRow =>
    currentRow.reduce((result, item) => `${item.slug}`, "");

  getRows = (layout, displayType, rowOfColumns, tableStyle, resizeRows) => (
    <table className="main-table" style={tableStyle}>
      <tbody>
        {rowOfColumns.map(currentRow => (
          <tr key={this.getRowKey(currentRow)} className="main-row ">
            {currentRow.map(post => (
              <td
                key={`${post.slug} ${post.slug}`}
                className="main-col col-xs-4"
              >
                <div className="no-padding post-preview">
                  {this.getColumnLayout(
                    displayType,
                    layout,
                    post,
                    resizeRows && currentRow.length
                  )}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  getNumColumns = layout => {
    let numColumns = 1;
    switch (layout) {
      case "2 Columns":
        numColumns = 2;
        break;
      case "3 Columns":
        numColumns = 3;
        break;
      default:
        numColumns = 1;
        break;
    }

    return numColumns;
  };

  render() {
    let mainContent = "";
    let remainingPosts = "";
    let defaultLayout = "Single Column";
    let displayType = "Post";
    let numColumns = 1;
    const {
      posts,
      title,
      design,
      style,
      loadMore,
      resizeRows,
      addNewsLetter
    } = this.props;
    const { isMobile } = this.state;
    if (posts.length > 0) {
      const postsClone = [...posts.filter(n => n)];
      let pageDesign = { newRowLayout: [] };
      let tableStyle = {};
      if (design) {
        if (design.defaultRowLayout) defaultLayout = design.defaultRowLayout;
        if (design.defaultDisplayType) displayType = design.defaultDisplayType;
        if (design.newRowLayout && design.newRowLayout.length > 0) {
          tableStyle =
            design.newRowLayout.length > 1 && !isMobile
              ? { borderSpacing: "6px" }
              : {};
        }
        pageDesign = design;
      }
      const rowLayout =
        pageDesign.newRowLayout &&
        pageDesign.newRowLayout.map((obj, y) => ({
          id: y,
          obj
        }));
      mainContent =
        rowLayout &&
        rowLayout.map(rowInfo => {
          const layout = rowInfo.obj;
          const currentLayout = isMobile ? "Featured" : layout.rowLayout;
          const currentDisplay = layout.displayType;
          numColumns = this.getNumColumns(currentLayout);
          const row = _.slice(postsClone, 0, numColumns);
          const rowOfColumns = _.chunk(row, numColumns);
          postsClone.splice(0, numColumns);
          return (
            <div id={rowInfo.id} key={rowInfo.id}>
              {addNewsLetter && rowInfo.id === "3" && isMobile && (
                <div>
                  <NewsLetterContainer {...this.props} />
                </div>
              )}
              <div>
                {this.getRows(
                  currentLayout,
                  currentDisplay,
                  rowOfColumns,
                  tableStyle,
                  !!resizeRows
                )}
              </div>
            </div>
          );
        });

      if (postsClone.length > 0) {
        const currentLayout = isMobile ? "Featured" : defaultLayout;
        const currentDisplay = displayType;
        const remainingRows = _.chunk(
          postsClone,
          this.getNumColumns(currentLayout)
        ).map((obj, x) => ({
          id: x,
          obj
        }));

        tableStyle = !isMobile ? { borderSpacing: "6px" } : {};
        remainingPosts = remainingRows.map(row => (
          <div key={row.id}>
            {this.getRows(
              currentLayout,
              currentDisplay,
              [row.obj],
              tableStyle,
              !!resizeRows
            )}
          </div>
        ));
      }
    }
    return (
      <section className="post-list-container clearfix" style={style}>
        {title ? <div className="title">{title}</div> : ""}
        {posts.length > 0 && mainContent}
        {posts.length > 0 && remainingPosts}
        {posts.length > 0 && loadMore && (
          <div className="load-more-container ">
            <Button
              className="btn-primary btn-load-more"
              onClick={() => loadMore()}
            >
              LOAD MORE
            </Button>
          </div>
        )}
      </section>
    );
  }
}
