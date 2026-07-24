import axios from "axios";
import SiteOptionsApi from "./SiteOptionsApi";

jest.mock("axios");

describe("SiteOptionsApi", () => {
  let rootApi;
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    rootApi = { get: jest.fn(), put: jest.fn(), defaults: { headers: { common: {} } } };
    jsonApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    let call = 0;
    axios.create.mockImplementation(() => {
      call += 1;
      return call === 1 ? rootApi : jsonApi;
    });
    api = new SiteOptionsApi({ url: "https://hectv.org" });
  });

  it("gets the hectv-site-options fields", () => {
    api.getSiteOptions();

    expect(rootApi.get).toHaveBeenCalledWith("/wp-json/hectv/v1/site-options");
  });

  it("puts an update to the hectv-site-options fields", () => {
    const payload = { topbarCtas: [] };
    api.updateSiteOptions(payload);

    expect(rootApi.put).toHaveBeenCalledWith(
      "/wp-json/hectv/v1/site-options",
      payload
    );
  });
});
