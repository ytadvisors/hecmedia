import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import { ScaleLoader } from "react-spinners";
import Layout from "../containers/Layout";
import SEO from "../components/SEO";
import Articles from "./_templates/articles";
import Events from "./_templates/events";
import Magazines from "./_templates/magazines";
import Template1 from "./_templates/template-1";
import Template2 from "./_templates/template-2";
import Template3 from "./_templates/template-3";

const GET_PAGE_TEMPLATE = gql`
  query currentPost($uri: String!) {
    pageInfo: pageBy(uri: $uri) {
      content(format: RENDERED)
      title
      link
      pageTemplate
      contact {
        address
        directions
        faxNumber
        opportunities
        phoneNumber
      }
      about {
        phoneNumber
        address
        faxNumber
        tvProviders {
          provider
          channel
        }
        team {
          email
          name
          position
        }
        videoId
      }
    }
  }
`;

export default props => {
  const getTemplates = page => {
    const variables = { uri: page };
    const { loading, error, data } = useQuery(GET_PAGE_TEMPLATE, {
      variables,
      fetchPolicy: "cache-and-network"
    });

    if (loading)
      return (
        <div className="loading">
          <ScaleLoader
            sizeUnit="px"
            size={150}
            color="#0065bc"
            loading
            height={55}
            width={10}
          />
        </div>
      );
    if (error) {
      return <p>Error loading Category</p>;
    }

    const { pageInfo } = data;
    const { pageTemplate, title, link, content, contact, about } =
      pageInfo || {};
    let result = "";

    switch (pageTemplate) {
      case "template-1.php":
        result = (
          <Template1
            {...{
              ...props,
              title,
              link,
              pageContent: { ...about, content }
            }}
          />
        );
        break;
      case "template-2.php":
        result = <Template2 {...{ ...props, title, link, content }} />;
        break;
      case "template-3.php":
        result = (
          <Template3
            {...{
              ...props,
              title,
              link,
              pageContent: { ...contact, content }
            }}
          />
        );
        break;
      default:
        result = "";
        break;
    }
    return result;
  };

  const router = useRouter();
  const { query } = router;

  let result = <></>;
  if (query) {
    const { page } = query;
    switch (page) {
      case "articles":
        result = <Articles {...props} />;
        break;
      case "events":
        result = <Events {...props} />;
        break;
      case "magazines":
        result = <Magazines {...props} />;
        break;
      default:
        result = getTemplates(page);
    }
  }

  return (
    <>
      <SEO />
      <Layout>
        <section>{result}</section>
      </Layout>
    </>
  );
};
