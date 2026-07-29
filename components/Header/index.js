import React, { Component } from "react";
import Link from "next/link";
import $ from "jquery";
import { FaSearch } from "react-icons/fa";
import { Navbar, Nav, NavDropdown, Button } from "react-bootstrap";
import SearchForm from "../Forms/SearchForm";
import SocialLinks from "../SocialLinks";
import NavWrap from "../NavWrap";
import {
  getHeaderMenuObject,
  getSocialMenuObject,
  getHref
} from "../../lib/getFunctions";
import { isServer } from "../../lib/serverFunctions";
import "./styles.scss";

const logo = "/static/assets/white_hec.png";
const TAGLINE = "St. Louis' Home of Education Arts, and Culture";
const toRelativeCtaUrl = url =>
  url.replace(
    /^https?:\/\/(?:www\.)?(?:hecmedia\.org|hectv\.org)(?=\/|$)/i,
    ""
  ) || "/";

export default class Header extends Component {
  constructor(props) {
    super(props);
    this.mounted = true;
    this.state = {
      open: {},
      navExpanded: false,
      activeDropdown: null,
      isMobile: false,
      scrolled: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    $("#main-nav > div:first-child").addClass("main-container");
    this.setState({ isMobile: window.innerWidth <= 1170 });
    window.addEventListener("resize", this.resize);
    window.addEventListener("scroll", this.updateScrollState, {
      passive: true
    });
    this.updateScrollState();
  }

  componentWillUnmount() {
    this.mounted = false;
    if (!isServer) {
      window.removeEventListener("resize", this.resize);
      window.removeEventListener("scroll", this.updateScrollState);
    }
  }

  resize = () => {
    if (this.mounted) this.setState({ isMobile: window.innerWidth <= 1170 });
  };

  updateScrollState = () => {
    const scrolled = window.pageYOffset > 0 || window.scrollY > 0;
    if (this.mounted) {
      this.setState(currentState =>
        currentState.scrolled === scrolled ? null : { scrolled }
      );
    }
  };

  search = () => {
    this.setToggle("#", false);
    const { searchFunc } = this.props;
    searchFunc();
  };

  setToggle = (url, isOpen = true) => {
    if (this.mounted) {
      this.setState(prevState => {
        const state = { ...prevState };
        state.open[url] = isOpen;
        return { open: state.open };
      });
    }
  };

  setNavExpanded = expanded => {
    if (this.mounted) {
      this.setState({ navExpanded: expanded });
    }
  };

  closeNav = () => {
    if (this.mounted) {
      this.setState({ navExpanded: false, activeDropdown: null });
    }
  };

  setActiveDropdown = (url, isOpen) => {
    if (this.mounted) {
      this.setState({ activeDropdown: isOpen ? url : null });
    }
  };

  setNestedDropdown = (url, isOpen) => {
    if (this.mounted) {
      this.setState(prevState => ({
        open: { ...prevState.open, [url]: isOpen }
      }));
    }
  };

  focusNestedMenu = trigger => {
    const submenu = trigger
      .closest(".dropdown-submenu")
      .querySelector(".dropdown-menu a, .dropdown-menu button");
    if (submenu) submenu.focus();
  };

  handleNestedDropdownKeyDown = (event, url) => {
    const { key, currentTarget } = event;
    if (key === "ArrowRight" || key === "ArrowDown") {
      event.preventDefault();
      this.setNestedDropdown(url, true);
      window.setTimeout(() => this.focusNestedMenu(currentTarget), 0);
    }
    if (key === "ArrowLeft" || key === "Escape") {
      event.preventDefault();
      this.setNestedDropdown(url, false);
      if (key === "Escape") {
        const topToggle = currentTarget
          .closest(".dropdown")
          .querySelector(".dropdown-toggle");
        if (topToggle) topToggle.focus();
      }
    }
  };

  handleTopDropdownKeyDown = (event, url) => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.setActiveDropdown(url, false);
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      this.setActiveDropdown(url, true);
      window.setTimeout(() => {
        const topMenu = event.currentTarget.querySelector(".dropdown-menu a");
        if (topMenu) topMenu.focus();
      }, 0);
    }
  };

  getDropdownItem = link => {
    const { url, label, children = [] } = link;
    const { open } = this.state;
    const isOpen = open[url] === true;
    const hasChildren = children.length > 0;

    if (!hasChildren) {
      return <NavWrap key={`${label} ${url}`}>{this.getLink(link)}</NavWrap>;
    }

    return (
      <li
        key={`${label} ${url}`}
        className={`dropdown-submenu${isOpen ? " open" : ""}`}
        onMouseEnter={() => this.setNestedDropdown(url, true)}
        onMouseLeave={() => this.setNestedDropdown(url, false)}
      >
        <div className="dropdown-submenu__item">
          {this.getLink(link)}
          <button
            type="button"
            className="dropdown-submenu__toggle"
            aria-label={`Show ${label} submenu`}
            aria-expanded={isOpen}
            onClick={() => this.setNestedDropdown(url, !isOpen)}
            onKeyDown={event => this.handleNestedDropdownKeyDown(event, url)}
          >
            <span aria-hidden="true">▸</span>
          </button>
        </div>
        <ul className="dropdown-menu">{children.map(this.getDropdownItem)}</ul>
      </li>
    );
  };

  getNavDropDown = link => {
    const { url, label } = link;
    const { activeDropdown } = this.state;
    const btnDisplay = link.btnClass || "btn-secondary";

    return (
      <NavDropdown
        key={`${label} ${url}`}
        className={`btn ${btnDisplay}`}
        title={label}
        id={url}
        open={activeDropdown === url}
        onToggle={isOpen => this.setActiveDropdown(url, isOpen)}
        onKeyDown={event => this.handleTopDropdownKeyDown(event, url)}
      >
        {link.children.map(this.getDropdownItem)}
      </NavDropdown>
    );
  };

  getLink = link => {
    const { url, label, buttonClick } = link;
    const cleanUrl = url && url.replace(/https?:\/\/[^/]+/, "");
    const isRedirect = url && url.match(/^\/\//);
    const actualLink = getHref(cleanUrl);

    if (buttonClick) {
      return (
        <Button
          onClick={event => {
            this.closeNav();
            buttonClick(event);
          }}
          dangerouslySetInnerHTML={{
            __html: label
          }}
        />
      );
    }
    if (isRedirect) {
      return (
        <a
          aria-labelledby="redirect"
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={this.closeNav}
        >
          <span
            dangerouslySetInnerHTML={{
              __html: label
            }}
          />
        </a>
      );
    }
    if (label.toLowerCase() === "events") {
      return (
        <a href={cleanUrl} onClick={this.closeNav}>
          <span
            dangerouslySetInnerHTML={{
              __html: label
            }}
          />
        </a>
      );
    }
    return (
      <Link href={actualLink} as={cleanUrl}>
        <a>
          <div
            onKeyPress={() => {}}
            onClick={this.closeNav}
            role="presentation"
          >
            <span
              dangerouslySetInnerHTML={{
                __html: label
              }}
            />
          </div>
        </a>
      </Link>
    );
  };

  getNavItem = link => {
    const { currentPage } = this.props;
    const { url, icon, label, iconPlacement, btnClass, toggle, onClick } = link;
    const cleanUrl = url.replace(/https?:\/\/[^/]+/, "");
    const btnDisplay = btnClass || "btn-secondary";
    const clickFunction = toggle ? () => {} : onClick;
    const { open } = this.state;

    return open[url] ? (
      <NavWrap
        key={`${label} ${url}`}
        className={`${
          currentPage === cleanUrl.replace(/\//g, "")
            ? `btn show ${btnDisplay}`
            : `btn  ${btnDisplay}`
        }`}
        onClick={() => clickFunction(cleanUrl)}
      >
        {toggle}
      </NavWrap>
    ) : (
      <NavWrap
        key={`${label} ${url}`}
        className={`${
          currentPage === cleanUrl.replace(/\//g, "")
            ? `btn show ${btnDisplay}`
            : `btn  ${btnDisplay}`
        }`}
      >
        {icon && iconPlacement !== "right" ? icon : ""}
        {label && this.getLink(link)}
      </NavWrap>
    );
  };

  getLinks = links =>
    links.map(link =>
      link.children ? this.getNavDropDown(link) : this.getNavItem(link)
    );

  render() {
    const { header, social, topbarCtas } = this.props;
    const { navExpanded, isMobile, scrolled } = this.state;
    const style = isMobile
      ? { width: `${window.innerWidth - 50}px`, right: "12px" }
      : {};
    const { node: { menuItems: { edges: headerList = [] } = {} } = {} } =
      (header && header.edges && header.edges[0]) || {};
    const { node: { menuItems: { edges: socialList = [] } = {} } = {} } = social
      ? social.edges[0]
      : {};

    const topLinks =
      headerList.length > 0 ? getHeaderMenuObject(headerList) : [];
    const socialLinks =
      socialList.length > 0
        ? getSocialMenuObject(socialList, isMobile ? 15 : 20, "white").filter(
            socialLink => socialLink.label.toLowerCase() !== "twitter"
          )
        : [];

    const userAdmin = [
      {
        url: "#",
        btnClass: "btn-secondary pull-right search-btn",
        icon: (
          <Button
            className="search-btn-icon"
            onClick={() => this.setToggle("#", true)}
          >
            <FaSearch className="search-icon" size="20" color="#444" />
          </Button>
        ),
        toggle: (
          <div>
            <div className="search-container" style={style}>
              <div className="row">
                <div className="search-input col-xs-10 no-padding">
                  <SearchForm callbackFunc={this.search} />
                </div>
                <Button
                  className="col-xs-2 text-center search-icon-container"
                  style={{ verticalAlign: "middle" }}
                  onClick={() => this.search()}
                >
                  <FaSearch className="search-icon" color="#222" />
                </Button>
              </div>
            </div>
            <Button
              className="gradient"
              onClick={() => this.setToggle("#", false)}
            />
          </div>
        )
      }
    ];
    const ctas = Array.isArray(topbarCtas)
      ? topbarCtas
          .filter(
            cta =>
              cta &&
              typeof cta.label === "string" &&
              cta.label.trim() &&
              typeof cta.url === "string" &&
              cta.url.trim()
          )
          .map((cta, sourceIndex) => ({
            ...cta,
            label: cta.label.trim(),
            url: cta.url.trim(),
            sourceIndex
          }))
      : [];

    return (
      <header
        className={`header header--sticky${
          scrolled ? " header--scrolled" : ""
        }`}
      >
        <Navbar
          inverse
          className="navbar-class"
          id="main-nav"
          onToggle={this.setNavExpanded}
          expanded={navExpanded}
        >
          <Navbar.Header className="navbar-header-class">
            <div className="header-top-row">
              <div className="top-logo">
                <Navbar.Brand className="navbar-brand-class">
                  <div className="navbar-brand-class navbar-brand">
                    <Link as="/" href="/">
                      <img src={logo} alt="HECTV logo" />
                    </Link>
                  </div>
                </Navbar.Brand>
                <div className="brand-information">
                  <span className="brand-tagline">{TAGLINE}</span>
                  <div className="header-secondary-row">
                    <SocialLinks links={socialLinks} />
                    {ctas.length > 0 && (
                      <nav
                        className={`top-bar-actions top-bar-actions--${ctas.length}`}
                        aria-label="Featured actions"
                      >
                        {ctas.map(cta => (
                          <a
                            key={`${cta.url}-${cta.label}-${cta.sourceIndex}`}
                            className="top-bar-cta"
                            href={toRelativeCtaUrl(cta.url)}
                          >
                            {cta.label}
                          </a>
                        ))}
                      </nav>
                    )}
                  </div>
                </div>
              </div>
              <div className="header-top-actions">
                <Nav onSelect={this.closeNav} className="user-admin">
                  {this.getLinks(userAdmin)}
                </Nav>
                <Navbar.Toggle className="nav-toggle " />
              </div>
            </div>
          </Navbar.Header>
          <div className="bottom-nav row">
            <Navbar.Collapse>
              <Nav
                onSelect={this.closeNav}
                className="pull-left top-navigation left-links"
              >
                {this.getLinks(topLinks)}
              </Nav>
            </Navbar.Collapse>
          </div>
        </Navbar>
      </header>
    );
  }
}
