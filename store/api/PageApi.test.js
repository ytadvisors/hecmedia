import axios from "axios";
import PageApi from "./PageApi";

jest.mock("axios");

describe("PageApi", () => {
  let rootApi;
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    rootApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    jsonApi = { get: jest.fn(), defaults: { headers: { common: {} } } };
    let call = 0;
    axios.create.mockImplementation(() => {
      call += 1;
      return call === 1 ? rootApi : jsonApi;
    });
    api = new PageApi({ url: "https://hectv.org" });
  });

  it("gets the about us page", () => {
    api.getAboutUs();

    expect(jsonApi.get).toHaveBeenCalledWith("pages?slug=about-us");
  });

  it("gets a menu by id", () => {
    api.getMenus("42");

    expect(rootApi.get).toHaveBeenCalledWith(
      "/wp-json/wp-api-menus/v2/menus/42"
    );
  });

  it("gets a page by name", () => {
    api.getPage("about");

    expect(jsonApi.get).toHaveBeenCalledWith("pages?slug=about");
  });

  it("gets testimonials", () => {
    api.getTestimonials(2);

    expect(jsonApi.get).toHaveBeenCalledWith("testimonial?page=2");
  });

  it("gets pricing plans", () => {
    api.getPricingPlans();

    expect(jsonApi.get).toHaveBeenCalledWith(
      "edplans?order_by=plan_price&order=asc"
    );
  });

  it("gets the live video", () => {
    api.getLiveVideo();

    expect(jsonApi.get).toHaveBeenCalledWith("livevideos");
  });
});
