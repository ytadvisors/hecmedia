import axios from "axios";
import MainApi from "./index";

jest.mock("axios");

describe("MainApi", () => {
  const createMock = () => ({
    defaults: { headers: { common: {} } }
  });

  beforeEach(() => {
    localStorage.clear();
    axios.create.mockReset();
    axios.create.mockImplementation(createMock);
  });

  it("creates a rootApi and jsonApi client from the given url", () => {
    // eslint-disable-next-line no-new
    new MainApi({ url: "https://hectv.org" });

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://hectv.org" })
    );
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://hectv.org/wp-json/wp/v2/" })
    );
  });

  it("falls back to GATSBY_WP_HOST when no url is provided", () => {
    process.env.GATSBY_WP_HOST = "https://fallback.hectv.org";

    // eslint-disable-next-line no-new
    new MainApi({});

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "https://fallback.hectv.org" })
    );

    delete process.env.GATSBY_WP_HOST;
  });

  it("does not set an Authorization header when no user is stored", () => {
    const instances = [];
    axios.create.mockImplementation(() => {
      const instance = createMock();
      instances.push(instance);
      return instance;
    });

    // eslint-disable-next-line no-new
    new MainApi({ url: "https://hectv.org" });

    instances.forEach(instance => {
      expect(instance.defaults.headers.common.Authorization).toBeUndefined();
    });
  });

  it("sets an Authorization header from a stored user token", () => {
    localStorage.setItem("user", JSON.stringify({ token: "abc123" }));

    const instances = [];
    axios.create.mockImplementation(() => {
      const instance = createMock();
      instances.push(instance);
      return instance;
    });

    // eslint-disable-next-line no-new
    new MainApi({ url: "https://hectv.org" });

    instances.forEach(instance => {
      expect(instance.defaults.headers.common.Authorization).toBe(
        "Bearer abc123"
      );
    });
  });
});
