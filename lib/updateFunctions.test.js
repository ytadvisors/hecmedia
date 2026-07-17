import {
  decodeHTML,
  cleanUrl,
  cleanText,
  getExcerpt,
  removeDuplicates,
  getArrayUnion,
  getQueryUpdate
} from "./updateFunctions";

describe("decodeHTML", () => {
  it("decodes named entities that are in the map", () => {
    expect(decodeHTML("a &gt; b")).toBe("a > b");
  });

  it("decodes numeric and hex character references", () => {
    expect(decodeHTML("&#65;")).toBe("A");
    expect(decodeHTML("&#x41;")).toBe("A");
  });

  it("leaves unknown named entities untouched", () => {
    expect(decodeHTML("&unknown;")).toBe("&unknown;");
  });
});

describe("cleanUrl", () => {
  it("strips the origin and keeps the path", () => {
    expect(cleanUrl("https://hectv.org/events/foo")).toBe("/events/foo");
  });

  it("prepends the given prefix", () => {
    expect(cleanUrl("https://hectv.org/events/foo", "/site")).toBe(
      "/site/events/foo"
    );
  });

  it("returns falsy input unchanged", () => {
    expect(cleanUrl("")).toBe("");
    expect(cleanUrl(null)).toBe(null);
  });
});

describe("cleanText", () => {
  it("strips HTML tags", () => {
    expect(cleanText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
});

describe("getExcerpt", () => {
  it("strips tags and returns short text unchanged", () => {
    expect(getExcerpt("<p>short</p>")).toBe("short");
  });

  it("truncates and appends an ellipsis for long text", () => {
    const long = `<p>${"a".repeat(210)}</p>`;

    const result = getExcerpt(long, 10);

    expect(result).toBe(`${"a".repeat(10)}...`);
  });
});

describe("removeDuplicates", () => {
  it("keeps only the first occurrence of each value for the given prop", () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 1 }];

    expect(removeDuplicates(input, "id")).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe("getArrayUnion", () => {
  it("unions edges from both arrays by the unique id", () => {
    const array1 = {
      posts: { __typename: "PostConnection", edges: [{ node: { id: "1" } }] }
    };
    const array2 = {
      posts: { edges: [{ node: { id: "1" } }, { node: { id: "2" } }] }
    };

    const result = getArrayUnion(array1, array2, "posts", "node.id");

    expect(result.posts.edges).toHaveLength(2);
    // __typename is copied onto the merged object's root, not onto `posts` —
    // that's the real (if surprising) shape the function produces.
    expect(result.__typename).toBe("PostConnection");
  });

  it("returns array2 unchanged when array1 or the prop is missing", () => {
    const array2 = { other: "value" };

    expect(getArrayUnion(null, array2, "posts", "node.id")).toEqual(array2);
  });
});

describe("getQueryUpdate", () => {
  it("returns prev when fetchMoreResult is missing", () => {
    const prev = { posts: { nodes: [{ id: 1 }] } };

    expect(getQueryUpdate(prev, {}, "posts")).toEqual(prev);
  });

  it("prepends prev nodes onto the freshly fetched nodes", () => {
    const prev = { posts: { nodes: [{ id: 1 }] } };
    const fetchData = {
      fetchMoreResult: { posts: { nodes: [{ id: 2 }] } }
    };

    const result = getQueryUpdate(prev, fetchData, "posts");

    expect(result.posts.nodes).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns the fetched result as-is when there are no prev nodes", () => {
    const fetchData = {
      fetchMoreResult: { posts: { nodes: [{ id: 2 }] } }
    };

    const result = getQueryUpdate(undefined, fetchData, "posts");

    expect(result.posts.nodes).toEqual([{ id: 2 }]);
  });
});
