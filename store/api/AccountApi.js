import querystring from "query-string";
import MainApi from "./index";

export default class AccountApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  login = (email, password, site) =>
    this.rootApi.post("/wp-json/hectv/v1/token/email", {
      username: email,
      password,
      site
    });

  loginOrRegisterThirdParty = (
    email,
    firstName,
    lastName,
    id,
    profilePicURL,
    provider,
    accessToken,
    idToken,
    site
  ) =>
    this.rootApi.post("/wp-json/hectv/v1/token/thirdparty", {
      email,
      firstName,
      lastName,
      id,
      profilePicURL,
      provider,
      accessToken,
      idToken,
      site
    });

  loadUser = () => this.jsonApi.get("/users/me");

  updateUser = user =>
    this.rootApi.put(`/wp-json/hectv/v1/users/me`, querystring.stringify(user));

  createUser = user =>
    this.rootApi.post(`/wp-json/hectv/v1/users`, querystring.stringify(user));
}
