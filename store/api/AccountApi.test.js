import axios from "axios";
import AccountApi from "./AccountApi";

jest.mock("axios");

describe("AccountApi", () => {
  let rootApi;
  let jsonApi;
  let api;

  beforeEach(() => {
    localStorage.clear();
    rootApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      defaults: { headers: { common: {} } }
    };
    jsonApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      defaults: { headers: { common: {} } }
    };
    let call = 0;
    axios.create.mockImplementation(() => {
      call += 1;
      return call === 1 ? rootApi : jsonApi;
    });
    api = new AccountApi({ url: "https://hectv.org" });
  });

  it("logs in with the given credentials", () => {
    api.login("a@b.com", "pw", "hectv");

    expect(rootApi.post).toHaveBeenCalledWith("/wp-json/hectv/v1/token/email", {
      username: "a@b.com",
      password: "pw",
      site: "hectv"
    });
  });

  it("logs in or registers via a third party provider", () => {
    api.loginOrRegisterThirdParty(
      "a@b.com",
      "First",
      "Last",
      "id1",
      "pic.jpg",
      "google",
      "access",
      "idtoken",
      "hectv"
    );

    expect(rootApi.post).toHaveBeenCalledWith(
      "/wp-json/hectv/v1/token/thirdparty",
      {
        email: "a@b.com",
        firstName: "First",
        lastName: "Last",
        id: "id1",
        profilePicURL: "pic.jpg",
        provider: "google",
        accessToken: "access",
        idToken: "idtoken",
        site: "hectv"
      }
    );
  });

  it("loads the current user", () => {
    api.loadUser();

    expect(jsonApi.get).toHaveBeenCalledWith("/users/me");
  });

  it("updates the user as a querystring payload", () => {
    api.updateUser({ first_name: "Jane" });

    expect(rootApi.put).toHaveBeenCalledWith(
      "/wp-json/hectv/v1/users/me",
      "first_name=Jane"
    );
  });

  it("creates a user as a querystring payload", () => {
    api.createUser({ email: "a@b.com" });

    expect(rootApi.post).toHaveBeenCalledWith(
      "/wp-json/hectv/v1/users",
      "email=a%40b.com"
    );
  });
});
