import React from "react";
import { FaPlayCircle } from "react-icons/fa";
import moment from "moment";
import { graphql } from "react-apollo";
import gql from "graphql-tag";

import { getCurrentPrograms } from "../../lib/getFunctions";
import "./styles.scss";

const mDay = moment(new Date());
const slug = moment(mDay)
  .format("MMMM-YYYY")
  .toLowerCase();

const Schedule = ({ data: { programs = {} } }) => {
  const { scheduleDetails: { schedulePrograms } = {} } = programs;
  const dailyPrograms = schedulePrograms
    ? getCurrentPrograms(schedulePrograms, 5)
    : null;
  return (
    <section className="schedule">
      <h4 className="title">Playing Now</h4>
      <ul className="program">
        {dailyPrograms &&
          dailyPrograms.values &&
          dailyPrograms.values.map((program, x) => (
            <li
              key={program.programStartTime}
              className={`program ${x === 0 ? "active" : ""}`}
            >
              <FaPlayCircle
                size="20"
                color={x === 0 ? "#0065bc" : "#aaa"}
                className="program-icon"
              />
              <span>
                {` ${program.programStartTime} | ${program.programTitle}`}
              </span>
            </li>
          ))}
      </ul>
    </section>
  );
};

export const allPrograms = gql`
  query allPrograms($slug: String!) {
    programs: scheduleBy(slug: $slug) {
      scheduleDetails {
        schedulePrograms {
          programStartTime
          programEndTime
          programTitle
          programStartDate
        }
      }
    }
  }
`;

export default graphql(allPrograms, {
  options: { variables: { slug } }
})(Schedule);
