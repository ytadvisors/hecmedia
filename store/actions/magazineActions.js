import * as types from "../types/magazineTypes";

export const loadMagazineAction = magazineId => ({
  type: types.LOAD_MAGAZINE,
  magazineId
});

export const loadMagazineListAction = () => ({
  type: types.LOAD_MAGAZINE_LIST
});

export const loadAllMagazinesAction = (
  magazineTypes = [],
  page,
  loadMore = false
) => ({
  type: types.LOAD_ALL_MAGAZINES,
  magazineTypes,
  page,
  loadMore
});
