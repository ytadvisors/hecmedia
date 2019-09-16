import MainApi from "./index";

export default class DonateApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getAllDonations = (page = 1, perPage) =>
    this.jsonApi.get(`donations?perPage=${perPage}&page=${page}`);

  getDonation = donationId => this.jsonApi.get(`donations/${donationId}`);
}
