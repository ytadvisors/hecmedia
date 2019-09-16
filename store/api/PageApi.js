import MainApi from "./index";

export default class PageApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getAboutUs = () => this.jsonApi.get("pages?slug=about-us");

  getMenus = (id = "") =>
    this.rootApi.get(`/wp-json/wp-api-menus/v2/menus/${id}`);

  getPage = pageName => this.jsonApi.get(`pages?slug=${pageName}`);

  getTestimonials = (page = 1) => this.jsonApi.get(`testimonial?page=${page}`);

  getPricingPlans = () =>
    this.jsonApi.get(`edplans?order_by=plan_price&order=asc`);

  getLiveVideo = () => this.jsonApi.get(`livevideos`);
}
