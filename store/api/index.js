import axios from "axios";

export default class MainApi {
  constructor({ url }) {
    const apiUrl = url || process.env.GATSBY_WP_HOST;
    const prefix = "/wp-json/wp/v2/";

    this.rootApi = axios.create({
      baseURL: apiUrl,
      timeout: 100000
    });

    this.jsonApi = axios.create({
      baseURL: apiUrl + prefix,
      timeout: 100000
    });

    const user = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : {};

    if (user.token && user.token !== "") {
      this.rootApi.defaults.headers.common.Authorization = `Bearer ${user.token}`;
      this.jsonApi.defaults.headers.common.Authorization = `Bearer ${user.token}`;
    }
  }
}
