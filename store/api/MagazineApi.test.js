import axios from "axios";
import MagazineApi from "./MagazineApi";

jest.mock("axios");

describe("MagazineApi", () => {
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    jsonApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    axios.create.mockImplementation(() => jsonApi);
    api = new MagazineApi({ url: "https://hectv.org" });
  });

  it("gets a magazine type by slug", () => {
    api.getType("faith");

    expect(jsonApi.get).toHaveBeenCalledWith("type?slug=faith");
  });

  it("gets all magazines with no type filter", () => {
    api.getAllMagazines([], 1, 5);

    expect(jsonApi.get).toHaveBeenCalledWith("magazine?perPage=5&page=1");
  });

  it("gets all magazines filtered by type", () => {
    api.getAllMagazines(["faith", "family"], 2, 5);

    expect(jsonApi.get).toHaveBeenCalledWith(
      "magazine?perPage=5&page=2&type[]=faith&type[]=family"
    );
  });

  it("gets a magazine by slug", () => {
    api.getMagazineBySlug("spring-issue");

    expect(jsonApi.get).toHaveBeenCalledWith("magazine?slug=spring-issue");
  });

  it("gets a magazine by id", () => {
    api.getMagazine("7");

    expect(jsonApi.get).toHaveBeenCalledWith("magazine/7");
  });
});
