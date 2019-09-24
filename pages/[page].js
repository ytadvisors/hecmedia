import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
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
  const loadPageTemplate = variables => {
    try {
      const { loading, error, data } = useQuery(GET_PAGE_TEMPLATE, {
        variables,
        fetchPolicy: "cache-and-network"
      });
      if (loading) return <p>Loading Page Template</p>;
      if (error) {
        return <p>Error Page Template</p>;
      }
      return data;
    } catch (err) {
      return {};
    }
  };

  const getTemplates = page => {
    const { pageInfo } = loadPageTemplate({ uri: page });
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
