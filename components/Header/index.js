import React, { Component } from "react";
import Link from "next/link";
import $ from "jquery";
import { FaSearch } from "react-icons/fa";
import shortid from "shortid";
import { Navbar, Nav, NavDropdown, Button } from "react-bootstrap";
import SearchForm from "../Forms/SearchForm";
import SocialLinks from "../SocialLinks";
import NavWrap from "../NavWrap";
import {
  getHeaderMenuObject,
  getSocialMenuObject,
  getHref
} from "../../lib/getFunctions";
import { buildNavigationPreview } from "../../lib/navigationPreview";
import { isServer } from "../../lib/serverFunctions";
import "./styles.scss";

const logo = "/static/assets/white_hec.png";

export default class Header extends Component {
  constructor(props) {
    super(props);
    this.mounted = true;
    this.state = {
      open: {},
      navExpanded: false,
      activeDropdown: null,
      isMobile: false,
      scrolled: false,
      showDonatePlaceholder: false
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

  showDonatePlaceholder = () => {
    if (this.mounted) this.setState({ showDonatePlaceholder: true });
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
      >
        {link.children.map(menu => (
          <NavWrap key={shortid.generate()}>{this.getLink(menu)}</NavWrap>
        ))}
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
    const { header, social } = this.props;
    const {
      navExpanded,
      isMobile,
      scrolled,
      showDonatePlaceholder
    } = this.state;
    const style = isMobile
      ? { width: `${window.innerWidth - 50}px`, right: "12px" }
      : {};
    const { node: { menuItems: { edges: headerList = [] } = {} } = {} } = header
      ? header.edges[0]
      : {};
    const { node: { menuItems: { edges: socialList = [] } = {} } = {} } = social
      ? social.edges[0]
      : {};

    const topLinks =
      headerList.length > 0
        ? buildNavigationPreview(getHeaderMenuObject(headerList))
        : [];
    const socialLinks =
      socialList.length > 0
        ? getSocialMenuObject(socialList, isMobile ? 15 : 25, "white")
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
    const showTopBarCtas = process.env.HECMEDIA_TOPBAR_CTA_PREVIEW === "true";

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
            <div className="top-logo">
              <Navbar.Brand className="navbar-brand-class">
                <div className="navbar-brand-class navbar-brand">
                  <Link as="/" href="/">
                    <img src={logo} alt="HECTV logo" />
                  </Link>
                </div>
              </Navbar.Brand>
            </div>
            <div className="brand-details">
              <div className="brand-text">
                <div>St. Louis&apos; home of Education</div>
                <div>Arts, and Culture</div>
              </div>
              <SocialLinks links={socialLinks} />
            </div>
            {showTopBarCtas && (
              <nav className="top-bar-actions" aria-label="Featured actions">
                <a className="top-bar-cta" href="/#watch-live">
                  Watch Live
                </a>
                <a className="top-bar-cta" href="/newsletter">
                  Subscribe
                </a>
                <button
                  type="button"
                  className="top-bar-cta top-bar-cta--placeholder"
                  aria-describedby="donate-staging-description"
                  onClick={this.showDonatePlaceholder}
                >
                  Donate <span className="cta-staging-badge">Staging only</span>
                </button>
                <span id="donate-staging-description" className="sr-only">
                  Staging placeholder. Donations are disabled and no transaction
                  can be created.
                </span>
                {showDonatePlaceholder && (
                  <p className="cta-placeholder-message" role="status">
                    Donations are disabled in this staging preview.
                  </p>
                )}
              </nav>
            )}
            <Navbar.Toggle className="nav-toggle " />
            <Nav
              onSelect={this.closeNav}
              className="user-admin pull-right clearfix"
            >
              {this.getLinks(userAdmin)}
            </Nav>
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
