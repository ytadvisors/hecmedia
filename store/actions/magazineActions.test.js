import * as types from "../types/magazineTypes";
import {
  loadMagazineAction,
  loadMagazineListAction,
  loadAllMagazinesAction
} from "./magazineActions";

describe("magazineActions", () => {
  it("creates a load-magazine action", () => {
    expect(loadMagazineAction("7")).toEqual({
      type: types.LOAD_MAGAZINE,
      magazineId: "7"
    });
  });

  it("creates a load-magazine-list action", () => {
    expect(loadMagazineListAction()).toEqual({
      type: types.LOAD_MAGAZINE_LIST
    });
  });

  it("creates a load-all-magazines action with defaults", () => {
    expect(loadAllMagazinesAction()).toEqual({
      type: types.LOAD_ALL_MAGAZINES,
      magazineTypes: [],
      page: undefined,
      loadMore: false
    });
  });

  it("creates a load-all-magazines action with overrides", () => {
    expect(loadAllMagazinesAction(["faith"], 2, true)).toEqual({
      type: types.LOAD_ALL_MAGAZINES,
      magazineTypes: ["faith"],
      page: 2,
      loadMore: true
    });
  });
});
