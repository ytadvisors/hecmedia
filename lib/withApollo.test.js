import React from "react";
import { render } from "@testing-library/react";
import withApollo from "./withApollo";

const mockApolloClient = { cache: { extract: jest.fn(() => ({ Query: {} })) } };
const mockInitApollo = jest.fn(() => mockApolloClient);

jest.mock("./initApollo", () => (...args) => mockInitApollo(...args));
jest.mock("@apollo/react-ssr", () => ({ getDataFromTree: jest.fn() }));

function StubApp({ apolloClient }) {
  return (
    <div data-testid="stub-app">
      {apolloClient ? "has-client" : "no-client"}
    </div>
  );
}

describe("withApollo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets a descriptive displayName", () => {
    const Wrapped = withApollo(StubApp);

    expect(Wrapped.displayName).toBe("withApollo(App)");
  });

  it("reuses an apolloClient passed in via props instead of creating a new one", () => {
    const Wrapped = withApollo(StubApp);

    const { getByTestId } = render(
      <Wrapped apolloClient={mockApolloClient} apolloState={{ data: {} }} />
    );

    expect(mockInitApollo).not.toHaveBeenCalled();
    expect(getByTestId("stub-app")).toHaveTextContent("has-client");
  });

  it("creates a client from apolloState when none is provided", () => {
    const Wrapped = withApollo(StubApp);

    render(<Wrapped apolloState={{ data: { Query: {} } }} />);

    expect(mockInitApollo).toHaveBeenCalledWith({ Query: {} }, {});
  });

  describe("getInitialProps", () => {
    it("returns an empty object once the response has already finished", async () => {
      const Wrapped = withApollo(StubApp);
      const ctx = { ctx: { req: {}, res: { finished: true } } };

      const result = await Wrapped.getInitialProps(ctx);

      expect(result).toEqual({});
    });

    it("merges the wrapped app's initial props with the extracted apollo state", async () => {
      StubApp.getInitialProps = jest.fn(async () => ({ extra: "prop" }));
      const Wrapped = withApollo(StubApp);
      const ctx = { ctx: { req: {}, res: undefined } };

      const result = await Wrapped.getInitialProps(ctx);

      expect(result).toEqual({
        extra: "prop",
        apolloState: { data: { Query: {} } }
      });
      delete StubApp.getInitialProps;
    });
  });
});
