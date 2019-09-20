import React from "react";
import { useRouter } from "next/router";
import Category from "../../../_templates/category";
import Layout from "../../../../containers/Layout";
import SEO from "../../../../components/SEO";

export default props => {
  const router = useRouter();
  const {
    query: { cid }
  } = router;

  return (
    <>
      <SEO />
      <Layout>
        <Category {...props} category={cid} />
      </Layout>
    </>
  );
};
