import React from "react";
import { useRouter } from "next/router";
import { useQuery } from "@apollo/react-hooks";
import Articles from "../containers/_templates/articles";
import Category from "../containers/_templates/category";

import Events from "./events";
import Magazines from "../containers/_templates/magazines";
import Template1 from "../containers/_templates/template-1";
import Template2 from "../containers/_templates/template-2";
import Template3 from "../containers/_templates/template-3";
import { GET_PAGE_TEMPLATE } from "../lib/graphql";

export default props => {
  const router = useRouter();
  const { query } = router;
  const { page } = query;

  const variables = { uri: page };
  const { data } = useQuery(GET_PAGE_TEMPLATE, {
    variables
  });

  const { pageInfo } = data || {};
  const { pageTemplate, title, link, content, contact, about } = pageInfo || {};

  let result = [];
  const category = "spotlight";
  const spotlightLink = `${process.env.WP_HOST}/category/spotlight/`;

  switch (page) {
    case "spotlight":
      result = (
        <Category
          {...{
            ...props,
            category,
            link: spotlightLink
          }}
        />
      );
      break;
    case "articles":
      result = (
        <Articles
          {...{
            ...props,
            title,
            link,
            content
          }}
        />
      );
      break;
    case "magazines":
      result = (
        <Magazines
          {...{
            ...props,
            title,
            link,
            content
          }}
        />
      );
      break;
    default:
      switch (pageTemplate) {
        case "template-1.php":
          result = (
            <Template1
              {...{
                ...props,
                title,
                link,
                pageContent: { ...about, content },
                key: link
              }}
            />
          );
          break;
        case "template-2.php":
          result = (
            <Template2
              {...{
                ...props,
                title,
                link,
                content,
                key: link
              }}
            />
          );
          break;
        case "template-3.php":
          result = (
            <Template3
              {...{
                ...props,
                title,
                link,
                pageContent: { ...contact, content },
                key: link
              }}
            />
          );
          break;
        default:
          result = "";
          break;
      }
  }

  if (page === "events")
    return (
      <Events
        {...{
          ...props,
          title,
          link,
          content
        }}
      />
    );

  return result;
};
