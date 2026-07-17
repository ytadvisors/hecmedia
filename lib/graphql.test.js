import * as queries from "./graphql";

const queryEntries = Object.entries(queries);

describe("graphql query documents", () => {
  it("exports at least one named query document", () => {
    expect(queryEntries.length).toBeGreaterThan(0);
  });

  it.each(queryEntries)(
    "%s parses into a single valid GraphQL operation",
    (name, doc) => {
      expect(doc.kind).toBe("Document");
      const operations = doc.definitions.filter(
        def => def.kind === "OperationDefinition"
      );
      expect(operations).toHaveLength(1);
      expect(operations[0].name.value).toEqual(expect.any(String));
    }
  );

  it("does not define the same operation name twice", () => {
    const operationNames = queryEntries.map(
      ([, doc]) =>
        doc.definitions.find(def => def.kind === "OperationDefinition").name
          .value
    );

    expect(new Set(operationNames).size).toBe(operationNames.length);
  });
});
