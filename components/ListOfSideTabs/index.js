import React, { Component } from "react";
import PropTypes from "prop-types";
import "./styles.scss";

export default class ListOfSideTabs extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: props.currentTab
    };
  }

  changeTab = currentTab => {
    this.setState({ currentTab });
  };

  render() {
    const { tabs } = this.props;
    const { currentTab } = this.state;

    return (
      <section className="list-of-side-tabs" id="subscribe">
        <div className="tab-header">
          {tabs.map(tab => (
            <div
              className={tab.title === currentTab ? "active" : ""}
              key={`${tab.title}-tab`}
            >
              {tab.title}
            </div>
          ))}
        </div>
        {tabs.map(
          tab =>
            tab.title === currentTab && (
              <div key={`${tab.title}-content`} className="tab-content">
                {tab.content}
              </div>
            )
        )}
      </section>
    );
  }
}

ListOfSideTabs.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentTab: PropTypes.string.isRequired
};
