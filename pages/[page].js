import React from "react";
import { useRouter } from "next/router";
import Articles from "./_templates/articles";
import Events from "./_templates/events";
import Magazines from "./_templates/magazines";
import Search from "./_templates/search";
import Index from "./index";

export default props => {
  const router = useRouter();
  const {
    query: { page }
  } = router;
  let content = <></>;
  switch (page) {
    case "articles":
      content = <Articles {...props} />;
      break;
    case "events":
      content = <Events {...props} />;
      break;
    case "magazines":
      content = <Magazines {...props} />;
      break;
    case "search":
      content = <Search {...props} />;
      break;
    default:
      content = <Index {...props} />;
      break;
  }

  return content;
};
