import React from "react";
import { useRouter } from "next/router";
import Events from "../../../containers/_templates/events";

export default props => {
  const router = useRouter();
  const {
    query: { category, day }
  } = router;

  return <Events {...props} currentCategory={category} currentDate={day} />;
};
