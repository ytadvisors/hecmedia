import {
  restMenuToGraphqlShape,
  fetchMenuBySlug,
  getWpHost
} from "./wpMenuRest";

describe("wpMenuRest", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("getWpHost prefers WP_HOST then strips /graphql from Apollo URI", () => {
    process.env.WP_HOST = "https://staging-wp.hectv.org/";
    expect(getWpHost()).toBe("https://staging-wp.hectv.org");

    delete process.env.WP_HOST;
    delete process.env.GATSBY_WP_HOST;
    process.env.APOLLO_CLIENT_URI = "https://staging-wp.hectv.org/graphql";
    expect(getWpHost()).toBe("https://staging-wp.hectv.org");
  });

  it("restMenuToGraphqlShape maps REST items to GraphQL edges", () => {
    const shape = restMenuToGraphqlShape({
      name: "Footer",
      slug: "footer",
      items: [
        {
          title: "About Us",
          url: "https://staging-wp.hectv.org/about-us/",
          parent: 0
        },
        {
          title: "Home",
          url: "https://staging-wp.hectv.org/",
          parent: 0
        }
      ]
    });

    expect(shape.edges).toHaveLength(1);
    const items = shape.edges[0].node.menuItems.edges;
    expect(items).toHaveLength(2);
    expect(items[0].node).toMatchObject({
      label: "About Us",
      url: "https://staging-wp.hectv.org/about-us/",
      path: "/about-us/"
    });
    expect(items[1].node.label).toBe("Home");
  });

  it("preserves nested Header menu dropdowns from the REST payload", () => {
    const shape = restMenuToGraphqlShape({
      name: "Header",
      slug: "header",
      items: [
        {
          id: 31242,
          title: "Genres",
          url: "https://prod-wp.hectv.org/category/",
          parent: 0,
          children: [
            {
              id: 31247,
              title: "Community",
              url: "https://prod-wp.hectv.org/category/community/",
              parent: 31242,
              children: [
                {
                  id: 67291,
                  title: "Two on the Aisle",
                  url:
                    "https://prod-wp.hectv.org/category/arts/two_on_the_aisle/",
                  parent: 31247
                }
              ]
            }
          ]
        }
      ]
    });

    const genres = shape.edges[0].node.menuItems.edges[0].node;
    const community = genres.childItems.edges[0].node;
    const twoOnTheAisle = community.childItems.edges[0].node;
    expect(genres).toMatchObject({
      databaseId: 31242,
      label: "Genres",
      path: "/category/",
      parentDatabaseId: 0
    });
    expect(community).toMatchObject({
      databaseId: 31247,
      label: "Community",
      path: "/category/community/",
      parentDatabaseId: 31242
    });
    expect(twoOnTheAisle).toMatchObject({
      databaseId: 67291,
      label: "Two on the Aisle",
      path: "/category/arts/two_on_the_aisle/",
      parentDatabaseId: 31247
    });
  });

  it("restMenuToGraphqlShape returns empty edges for bad payloads", () => {
    expect(restMenuToGraphqlShape(null)).toEqual({ edges: [] });
    expect(restMenuToGraphqlShape({ items: [] })).toEqual({ edges: [] });
  });

  it("does not derive a site path for external REST menu URLs", () => {
    const shape = restMenuToGraphqlShape({
      name: "Social",
      slug: "social",
      items: [
        {
          title: "Facebook",
          url: "https://facebook.com/hectv",
          object_slug: "hectv"
        }
      ]
    });

    expect(shape.edges[0].node.menuItems.edges[0].node).toMatchObject({
      label: "Facebook",
      url: "https://facebook.com/hectv",
      path: ""
    });
  });

  it("fetchMenuBySlug lists menus then loads the matching detail", async () => {
    process.env.WP_HOST = "https://staging-wp.hectv.org";
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { slug: "header", term_id: 1 },
          { slug: "footer", term_id: 14448 }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "Footer",
          slug: "footer",
          items: [
            {
              title: "Terms of Use",
              url: "https://staging-wp.hectv.org/terms-of-use/"
            }
          ]
        })
      });

    const shape = await fetchMenuBySlug("footer", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://staging-wp.hectv.org/wp-json/wp-api-menus/v2/menus"
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://staging-wp.hectv.org/wp-json/wp-api-menus/v2/menus/14448"
    );
    expect(shape.edges[0].node.menuItems.edges[0].node.label).toBe(
      "Terms of Use"
    );
  });

  it("fetchMenuBySlug returns null when the slug is missing", async () => {
    process.env.WP_HOST = "https://staging-wp.hectv.org";
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ slug: "header", term_id: 1 }]
    });
    expect(await fetchMenuBySlug("footer", fetchImpl)).toBeNull();
  });
});
