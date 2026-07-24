import MainApi from "./index";

export default class SiteOptionsApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getSiteOptions = () => this.rootApi.get("/wp-json/hectv/v1/site-options");

  updateSiteOptions = payload =>
    this.rootApi.put("/wp-json/hectv/v1/site-options", payload);
}
