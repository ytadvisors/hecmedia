import React from "react";
import _ from "lodash";
import ContentBlock from "../../ContentBlock";
import VideoPlayer from "../../VideoPlayer";

export default props => {
  const {
    content,
    address,
    phoneNumber,
    faxNumber,
    tvProviders,
    team,
    videoId
  } = props;
  const teamMap = _.chunk(team, 3).map((obj, x) => ({
    id: x,
    obj
  }));
  return (
    <section className="template-1">
      <div className="col-md-12 template-row">
        <VideoPlayer
          url={`https://vimeo.com/${videoId}`}
          containerStyle={{ padding: "0" }}
        />
      </div>
      <div className="row clearfix">
        <div className="col-md-6">
          <ContentBlock
            header="About"
            content={content}
            type="white-block"
            style={{ minHeight: "420px" }}
          />
        </div>
        <div className="col-md-6">
          <ContentBlock
            header={address}
            subheader={`Phone ${phoneNumber}<br/>Fax ${faxNumber}`}
            style={{ minHeight: "420px" }}
            data={
              tvProviders &&
              tvProviders.map(tv => (
                <div key={tv.provider}>
                  <strong>
                    <div dangerouslySetInnerHTML={{ __html: tv.provider }} />
                  </strong>
                  <br />
                  <div dangerouslySetInnerHTML={{ __html: tv.channel }} />
                </div>
              ))
            }
            type="blue-block"
          />
        </div>
        <div className="col-md-12 ">
          <ContentBlock
            header="Our Team"
            data={
              teamMap &&
              teamMap.map(map => (
                <ul key={map.id} className="row no-list">
                  {" "}
                  {map.obj.map(member => (
                    <li
                      className="col-md-4"
                      key={`${member.email} ${member.name}`}
                    >
                      <strong>{member.name}</strong>
                      <br />
                      <i>{member.position}</i>
                      <br />
                      <i>{member.email}</i>
                    </li>
                  ))}
                </ul>
              ))
            }
            type="white-block clearfix"
          />
        </div>
      </div>
    </section>
  );
};
