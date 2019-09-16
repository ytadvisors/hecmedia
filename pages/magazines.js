import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import Layout from "../containers/Layout";
import DefaultNav from "../components/SubNavigation/DefaultNav";
import SEO from "../components/SEO";
import ListOfPosts from "../components/ListOfPosts";

const magazineList = gql`
  query magazineList {
    magazines {
      edges {
        node {
          magazineId
          link
          slug
          title
          magazineDetail {
            coverImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
          }
        }
      }
    }
    pageData: pageBy(uri: "magazines") {
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
  }
`;

export default () => {
  const loadMagazines = variables => {
    try {
      const { loading, error, data } = useQuery(magazineList, {
        variables
      });

      if (loading) return <p>Loading Magazines</p>;
      if (error) {
        return <p>Error loading Magazines</p>;
      }
      return data;
    } catch (err) {
      console.log(err.message);
      return {};
    }
  };

  const { magazines, pageData: { feedDesign } = {} } = loadMagazines({});

  return (
    <>
      <SEO />
      <Layout>
        <div className="col-md-12">
          <DefaultNav title="Magazines" link="/magazines" />
        </div>
        <ListOfPosts
          posts={magazines ? magazines.edges.map(obj => obj.node) : []}
          link={{ page: "magazine" }}
          numResults={0}
          design={feedDesign}
          loadMore={null}
        />
      </Layout>
    </>
  );
};
