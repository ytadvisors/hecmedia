import React from "react";
import { useRouter } from "next/router";
import Category from "../../_templates/category";

export default props => {
  const router = useRouter();
  const {
    query: { pid }
  } = router;

  return <Category {...props} category={pid} />;
};
