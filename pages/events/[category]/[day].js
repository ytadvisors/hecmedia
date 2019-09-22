import React from "react";
import { useRouter } from "next/router";
import Layout from "../../../containers/Layout";
import SEO from "../../../components/SEO";
import Events from "../../_templates/events";

export default props => {
  const router = useRouter();
  const {
    query: { category, day }
  } = router;

  return (
    <>
      <SEO />
      <Layout>
        <Events {...props} currentCategory={category} currentDate={day} />
      </Layout>
    </>
  );
};
