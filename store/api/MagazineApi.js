import MainApi from "./index";

export default class MagazineApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getType = slug => this.jsonApi.get(`type?slug=${slug}`);

  getAllMagazines = (type_list = [], page = 1, perPage = 5) => {
    if (type_list.length === 0)
      return this.jsonApi.get(`magazine?perPage=${perPage}&page=${page}`);

    const query = type_list.join("&type[]=");
    return this.jsonApi.get(
      `magazine?perPage=${perPage}&page=${page}&type[]=${query}`
    );
  };

  getMagazineBySlug = slug => this.jsonApi.get(`magazine?slug=${slug}`);

  getMagazine = magazineId => this.jsonApi.get(`magazine/${magazineId}`);
}
