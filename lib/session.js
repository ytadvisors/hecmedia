import { isServer } from "./serverFunctions";

export function isLoggedIn() {
  if (!isServer) {
    const user = localStorage.getItem("user");
    const userObject = user ? JSON.parse(user) : {};
    return userObject.token;
  }
  return false;
}

export function getUser() {
  if (!isServer) {
    const user = localStorage.getItem("user");
    if (user) {
      return JSON.parse(user);
    }
  }
  return {};
}

export function getUserToken() {
  const user = getUser();
  return user.token ? user.token : "";
}

export function setUserToken(token) {
  if (!isServer) {
    const user = getUser();
    user.token = token;
    localStorage.setItem("user", JSON.stringify(user));
    return true;
  }
  return false;
}

export function deleteUser() {
  if (!isServer) {
    localStorage.removeItem("user");
  }
}
