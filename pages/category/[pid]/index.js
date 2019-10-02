import React from "react";
import { useRouter } from "next/router";
import Category from "../../../containers/_templates/category";

export default props => {
  const router = useRouter();
  const {
    query: { pid },
    asPath
  } = router;

  return <Category {...props} category={pid} link={asPath} />;
};
