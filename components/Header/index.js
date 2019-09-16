import React, { Component } from "react";
import { graphql } from "react-apollo";
import Link from "next/link";
import gql from "graphql-tag";
import $ from "jquery";
import { FaSearch } from "react-icons/fa";
import shortid from "shortid";
import { Navbar, Nav, NavDropdown, Button } from "react-bootstrap";
import { useRouter } from "next/router";
import SearchForm from "../Forms/SearchForm";
import SocialLinks from "../SocialLinks";
import NavWrap from "../NavWrap";
import {
  getHeaderMenuObject,
  getSocialMenuObject
} from "../../lib/getFunctions";
import { isServer } from "../../lib/serverFunctions";
import "./styles.scss";

const logo = "/static/assets/white_hec.png";

class Header extends Component {
  constructor(props) {
    super(props);
    this.mounted = true;
    this.state = {
      open: {},
      navExpanded: false,
      isMobile: false
    };
  }

  componentDidMount() {
    this.mounted = true;
    $("#main-nav > div:first-child").addClass("main-container");
    this.setState({ isMobile: window.innerWidth <= 1170 });
    window.addEventListener("resize", this.resize);
  }

  componentWillUnmount() {
    this.mounted = false;
    if (!isServer) window.removeEventListener("resize", this.resize);
  }

  resize = () => {
    if (this.mounted) this.setState({ isMobile: window.innerWidth <= 1170 });
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
      this.setState({ navExpanded: false });
    }
  };

  searchFunc = values => {
    if (values && values.search) {
      const router = useRouter();
      router.pushRoute(`/search/?q=${values.search}`);
    }
  };

  getNavDropDown = link => {
    const { url, label } = link;
    const btnDisplay = link.btnClass || "btn-secondary";

    return (
      <NavDropdown
        key={`${label} ${url}`}
        className={`btn ${btnDisplay}`}
        title={label}
        id={url}
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
    if (buttonClick) {
      return (
        <Button
          onClick={buttonClick}
          dangerouslySetInnerHTML={{
            __html: label
          }}
        />
      );
    }
    if (isRedirect) {
      return (
        <a
          href={cleanUrl}
          dangerouslySetInnerHTML={{
            __html: label
          }}
          alt="redirect"
          target="_blank"
          rel="noopener noreferrer"
        />
      );
    }
    return (
      <Link href={cleanUrl}>
        <a
          dangerouslySetInnerHTML={{
            __html: label
          }}
        />
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
    const {
      data: { header, social }
    } = this.props;
    const { navExpanded, isMobile } = this.state;
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
      headerList.length > 0 ? getHeaderMenuObject(headerList) : [];
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

    return (
      <section className="header">
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
                  <Link href="/">
                    <a>
                      <img src={logo} alt="HECTV logo" />
                    </a>
                  </Link>
                </div>
              </Navbar.Brand>
            </div>
            <div className="brand-details">
              <div className="brand-text">
                <div>
                  St. Louis
                  {`'`} home of Education
                </div>
                <div>Arts, and Culture</div>
              </div>
              <SocialLinks links={socialLinks} />
            </div>
            <Navbar.Toggle className="nav-toggle " />
            <Nav onSelect={this.closeNav} className="user-admin pull-right">
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
      </section>
    );
  }
}

export const allHeaders = gql`
  query allHeaders {
    header: menus(where: { slug: "header" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                childItems {
                  edges {
                    node {
                      url
                      label
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    social: menus(where: { slug: "social" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                childItems {
                  edges {
                    node {
                      url
                      label
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default graphql(allHeaders)(Header);
