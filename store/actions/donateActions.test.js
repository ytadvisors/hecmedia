import * as types from "../types/donateTypes";
import { loadDonationAction, loadAllDonationsAction } from "./donateActions";

describe("donateActions", () => {
  it("creates a load-donation action", () => {
    expect(loadDonationAction("42")).toEqual({
      type: types.LOAD_DONATION,
      donationId: "42"
    });
  });

  it("creates a load-all-donations action with defaults", () => {
    expect(loadAllDonationsAction(2)).toEqual({
      type: types.LOAD_ALL_DONATIONS,
      page: 2,
      perPage: 12,
      loadMore: false
    });
  });

  it("creates a load-all-donations action with loadMore", () => {
    expect(loadAllDonationsAction(3, true, 5)).toEqual({
      type: types.LOAD_ALL_DONATIONS,
      page: 3,
      perPage: 5,
      loadMore: true
    });
  });
});
