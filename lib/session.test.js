import {
  isLoggedIn,
  getUser,
  getUserToken,
  setUserToken,
  deleteUser
} from "./session";

describe("session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getUser", () => {
    it("returns an empty object when no user is stored", () => {
      expect(getUser()).toEqual({});
    });

    it("returns the parsed user when one is stored", () => {
      localStorage.setItem("user", JSON.stringify({ token: "abc" }));

      expect(getUser()).toEqual({ token: "abc" });
    });
  });

  describe("isLoggedIn", () => {
    it("returns falsy when there is no stored token", () => {
      expect(isLoggedIn()).toBeFalsy();
    });

    it("returns the token when a user is logged in", () => {
      localStorage.setItem("user", JSON.stringify({ token: "abc" }));

      expect(isLoggedIn()).toBe("abc");
    });
  });

  describe("getUserToken", () => {
    it("returns an empty string when the user has no token", () => {
      expect(getUserToken()).toBe("");
    });

    it("returns the stored token", () => {
      localStorage.setItem("user", JSON.stringify({ token: "xyz" }));

      expect(getUserToken()).toBe("xyz");
    });
  });

  describe("setUserToken", () => {
    it("merges the token into the stored user and returns true", () => {
      localStorage.setItem("user", JSON.stringify({ email: "a@b.com" }));

      const result = setUserToken("new-token");

      expect(result).toBe(true);
      expect(getUser()).toEqual({ email: "a@b.com", token: "new-token" });
    });
  });

  describe("deleteUser", () => {
    it("removes the stored user", () => {
      localStorage.setItem("user", JSON.stringify({ token: "abc" }));

      deleteUser();

      expect(getUser()).toEqual({});
    });
  });
});
