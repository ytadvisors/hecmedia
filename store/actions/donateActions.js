import * as types from "../types/donateTypes";

export const loadDonationAction = donationId => ({
  type: types.LOAD_DONATION,
  donationId
});

export const loadAllDonationsAction = (
  page,
  loadMore = false,
  perPage = 12
) => ({
  type: types.LOAD_ALL_DONATIONS,
  page,
  perPage,
  loadMore
});
