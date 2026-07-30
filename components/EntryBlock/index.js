import React from "react";
import { connect } from "react-redux";
import { useQuery } from "@apollo/react-hooks";
import moment from "moment";
import { GET_LAYOUT, GET_HOME_PAGE } from "../../lib/graphql";
import withApollo from "../../lib/withApollo";

const mDay = moment(new Date());
const currentMonth = moment(mDay)
  .format("MMMM-YYYY")
  .toLowerCase();

const EntryBlock = props => {
  const { children, page } = props;

  const { data: layout } = useQuery(GET_LAYOUT, {
    variables: { currentMonth },
    notifyOnNetworkStatusChange: true
  });

  const { data } = useQuery(GET_HOME_PAGE, {
    variables: { uri: page },
    notifyOnNetworkStatusChange: true
  });

  return (
    <div className="block" data={data} layout={layout}>
      {children}
    </div>
  );
};

export default connect()(withApollo(EntryBlock));
