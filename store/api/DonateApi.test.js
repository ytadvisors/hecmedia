import axios from "axios";
import DonateApi from "./DonateApi";

jest.mock("axios");

describe("DonateApi", () => {
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    jsonApi = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { headers: { common: {} } }
    };
    axios.create.mockImplementation(() => jsonApi);
    api = new DonateApi({ url: "https://hectv.org" });
  });

  it("gets a page of donations", () => {
    api.getAllDonations(2, 5);

    expect(jsonApi.get).toHaveBeenCalledWith("donations?perPage=5&page=2");
  });

  it("gets a single donation by id", () => {
    api.getDonation("42");

    expect(jsonApi.get).toHaveBeenCalledWith("donations/42");
  });
});
