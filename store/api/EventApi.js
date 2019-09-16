import MainApi from "./index";

export default class EventApi extends MainApi {
  constructor(props = {}) {
    super(props);
  }

  getEventType = (eventCategories = []) => {
    const query = eventCategories.join("&slug[]=");
    return this.jsonApi.get(`eventCategory?slug[]=${query}`);
  };

  getAllEvents = (type_list = [], day = "", page = 1, perPage) => {
    const dayQuery = day === "" ? "" : `&day=${day}`;
    if (type_list.length === 0)
      return this.jsonApi.get(
        `event?perPage=${perPage}&page=${page}${dayQuery}`
      );

    const query = type_list.join("&eventCategory[]=");
    return this.jsonApi.get(
      `event?perPage=${perPage}&page=${page}&eventCategory[]=${query}${dayQuery}`
    );
  };

  getEventsBySlugs = slugs => {
    const query = slugs.join("&slug[]=");
    return this.jsonApi.get(`event?slug[]=${query}`);
  };

  getEventBySlug = slug => this.jsonApi.get(`event?slug=${slug}`);

  getEvent = eventId => this.jsonApi.get(`event/${eventId}`);

  getEventCategories = (page = 1) =>
    this.jsonApi.get(`eventCategory?page=${page}`);
}
