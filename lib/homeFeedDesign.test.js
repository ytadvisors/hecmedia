import {
  hasFeedRowLayout,
  acfToFeedDesign,
  acfRequiredPostIds,
  fetchPageAcfLayout,
  resolveFeedDesign
} from "./homeFeedDesign";

describe("homeFeedDesign", () => {
  it("detects non-empty newRowLayout", () => {
    expect(hasFeedRowLayout(null)).toBe(false);
    expect(hasFeedRowLayout({ newRowLayout: [] })).toBe(false);
    expect(
      hasFeedRowLayout({
        newRowLayout: [{ rowLayout: "Featured", displayType: "Post" }]
      })
    ).toBe(true);
  });

  it("maps REST ACF repeater to GraphQL feedDesign shape", () => {
    const design = acfToFeedDesign({
      default_row_layout: "Single Column",
      default_display_type: "Post",
      new_row_layout: [
        { row_layout: "Featured", display_type: "Post" },
        { row_layout: "3 Columns", display_type: "Post" }
      ]
    });
    expect(design).toEqual({
      newRowLayout: [
        { rowLayout: "Featured", displayType: "Post" },
        { rowLayout: "3 Columns", displayType: "Post" }
      ],
      defaultDisplayType: "Post",
      defaultRowLayout: "Single Column"
    });
  });

  it("extracts required post IDs from ACF post_list", () => {
    expect(
      acfRequiredPostIds({
        post_list: [
          { post: { ID: 60235, post_title: "A" } },
          { post: 67322 },
          { post: { id: 59856 } }
        ]
      })
    ).toEqual([60235, 67322, 59856]);
  });

  it("fetchPageAcfLayout loads slug and maps ACF", async () => {
    process.env.WP_HOST = "https://staging-wp.hectv.org";
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          acf: {
            new_row_layout: [
              { row_layout: "Featured", display_type: "Wallpaper" }
            ],
            default_display_type: "Post",
            default_row_layout: "Single Column",
            post_list: [{ post: { ID: 1 } }]
          }
        }
      ]
    });
    const result = await fetchPageAcfLayout("home", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://staging-wp.hectv.org/wp-json/wp/v2/pages?slug=home"
    );
    expect(result.feedDesign.newRowLayout[0].displayType).toBe("Wallpaper");
    expect(result.requiredPostIds).toEqual([1]);
  });

  it("resolveFeedDesign prefers GraphQL, then REST, then classic Home defaults", () => {
    const gql = {
      newRowLayout: [{ rowLayout: "Featured", displayType: "Post" }],
      defaultDisplayType: "Post",
      defaultRowLayout: "Single Column"
    };
    const rest = {
      newRowLayout: [{ rowLayout: "3 Columns", displayType: "Wallpaper" }],
      defaultDisplayType: "Wallpaper",
      defaultRowLayout: "2 Columns"
    };
    expect(resolveFeedDesign(gql, rest)).toBe(gql);
    expect(resolveFeedDesign({ newRowLayout: [] }, rest)).toBe(rest);
    const classic = resolveFeedDesign({ newRowLayout: [] }, null);
    expect(classic.newRowLayout.length).toBeGreaterThan(1);
    expect(classic.newRowLayout[0].rowLayout).toBe("Featured");
    expect(classic.newRowLayout[1].rowLayout).toBe("3 Columns");
  });
});
