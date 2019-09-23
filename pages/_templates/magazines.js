import React from "react";
import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";
import DefaultNav from "../../components/SubNavigation/DefaultNav";
import ListOfPosts from "../../components/ListOfPosts";

const GET_MAGAZINES = gql`
  query MagazineList {
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
      const { loading, error, data } = useQuery(GET_MAGAZINES, {
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
      <div className="col-md-12">
        <DefaultNav title="Magazines" link="/magazines" />
      </div>
      <ListOfPosts
        posts={magazines ? magazines.edges.map(obj => obj && obj.node) : []}
        link={{ page: "magazine" }}
        numResults={0}
        design={feedDesign}
        loadMore={null}
      />
    </>
  );
};
