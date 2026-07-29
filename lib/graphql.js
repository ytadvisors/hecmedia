import gql from "graphql-tag";

export const GET_HOME_PAGE = gql`
  query HomePageInfo($uri: String!) {
    pageData: pageBy(uri: $uri) {
      title(format: RENDERED)
      content(format: RENDERED)
      link
      requiredPosts {
        postList {
          post {
            ... on Post {
              title(format: RENDERED)
              postDetails {
                videoImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                postHeader {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                isVideo
              }
              link
              categories(where: { shouldOutputInFlatList: true }) {
                edges {
                  node {
                    link
                    name
                  }
                }
              }
              postId
              slug
              excerpt(format: RENDERED)
              content(format: RENDERED)
            }
          }
        }
      }
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
    postData: posts(
      first: 10
      where: { orderby: { field: DATE, order: DESC } }
    ) {
      edges {
        node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            isVideo
          }
          link
          categories(where: { shouldOutputInFlatList: true }) {
            edges {
              node {
                link
                name
              }
            }
          }
          postId
          slug
          excerpt(format: RENDERED)
          content(format: RENDERED)
        }
      }
    }
  }
`;

export const GET_LAYOUT = gql`
  query PageLayout {
    featuredMagazines: magazines(
      first: 5
      where: { orderby: { field: DATE, order: DESC } }
    ) {
      edges {
        node {
          title
          link
          magazineDetail {
            coverImage {
              sourceUrl(size: MEDIUM)
            }
          }
        }
      }
    }
    spotLight: posts(
      first: 10
      where: {
        taxQuery: {
          relation: OR
          taxArray: {
            taxonomy: CATEGORY
            terms: ["spotlight"]
            operator: IN
            field: SLUG
            includeChildren: true
          }
        }
        orderby: { field: DATE, order: DESC }
      }
    ) {
      nodes {
        title(format: RENDERED)
        postDetails {
          videoImage {
            medium: sourceUrl(size: MEDIUM)
            large: sourceUrl(size: MEDIUM_LARGE)
          }
          postHeader {
            medium: sourceUrl(size: MEDIUM)
            large: sourceUrl(size: MEDIUM_LARGE)
          }
          isVideo
        }
        link
        postId
      }
    }
    header: menus(where: { slug: "header" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                childItems {
                  edges {
                    node {
                      url
                      label
                      childItems {
                        edges {
                          node {
                            url
                            label
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    footer: menus(where: { slug: "footer" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                childItems {
                  edges {
                    node {
                      url
                      label
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    social: menus(where: { slug: "social" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                childItems {
                  edges {
                    node {
                      url
                      label
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * The nested header menu contract is supplied by the staging WordPress stack
 * while the legacy layout fields still live upstream. Keep this operation
 * isolated so either schema can evolve without invalidating the site shell.
 */
export const GET_HEADER_MENU = gql`
  query HeaderMenu {
    header: menus(where: { slug: "header" }) {
      edges {
        node {
          menuItems(where: { parentDatabaseId: 0 }) {
            edges {
              node {
                label
                url
                parentDatabaseId
                childItems {
                  edges {
                    node {
                      url
                      label
                      parentDatabaseId
                      childItems {
                        edges {
                          node {
                            url
                            label
                            parentDatabaseId
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Keep the optional custom CTA field out of GET_LAYOUT. WordPress rejects an
 * entire operation when a queried field is not registered, which would
 * otherwise take down the existing site-shell data during staggered deploys.
 */
export const GET_TOPBAR_CTAS = gql`
  query TopbarCtas {
    topbarCtas {
      label
      url
      style
    }
  }
`;

/**
 * Trending Now auto-populates from the newest video-type posts. Kept out of
 * GET_LAYOUT so a WPGraphQL validation error here can't blank the rest of
 * the page shell (same reasoning as GET_TOPBAR_CTAS above).
 */
export const GET_NEWEST_VIDEOS = gql`
  query NewestVideos {
    newestVideos: posts(
      first: 4
      where: {
        orderby: { field: DATE, order: DESC }
        metaQuery: {
          metaArray: [{ key: "is_video", value: "1", compare: EQUAL_TO }]
        }
      }
    ) {
      nodes {
        title(format: RENDERED)
        postDetails {
          videoImage {
            medium: sourceUrl(size: MEDIUM)
            large: sourceUrl(size: MEDIUM_LARGE)
          }
          postHeader {
            medium: sourceUrl(size: MEDIUM)
            large: sourceUrl(size: MEDIUM_LARGE)
          }
        }
        featuredImage {
          sourceUrl(size: MEDIUM)
        }
        link
        postId
      }
    }
  }
`;

/**
 * hectv_featured_videos (Gate 0) lets an editor override Trending Now's
 * auto-populated order. It's a custom root field registered only by the
 * dev-infra/wordpress mu-plugin locally and by the equivalent production
 * registration — querying it inline with GET_LAYOUT would blank the whole
 * shell wherever it isn't registered yet, so it stays separate.
 */
export const GET_FEATURED_VIDEOS = gql`
  query FeaturedVideos {
    featuredVideos {
      title(format: RENDERED)
      featuredImage {
        node {
          sourceUrl(size: MEDIUM)
        }
      }
      link
      postId
    }
  }
`;

/**
 * The rail promo is editor-managed in WordPress. Keep it separate from the
 * shell query so an unavailable custom field cannot blank the rest of a page.
 */
export const GET_RAIL_PROMO = gql`
  query RailPromo {
    hectvSiteOptions {
      railPromo {
        image {
          sourceUrl
          altText
        }
        url
        alt
      }
    }
  }
`;

/**
 * Get the programs for the month.
 * Since this can generate an error, separate from the GET_LAYOUT request.
 */
export const GET_SCHEDULE = gql`
  query ScheduleLayout($currentMonth: String!) {
    programs: scheduleBy(slug: $currentMonth) {
      scheduleDetails {
        schedulePrograms {
          programStartTime
          programEndTime
          programTitle
          programStartDate
        }
      }
    }
  }
`;

export const GET_ALL_PAGE_CATEGORY = gql`
  query AllCategories($cursor: String!) {
    categories(after: $cursor, first: 10) {
      nodes {
        name
        link
        children {
          nodes {
            link
            name
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const GET_PAGE_CATEGORY = gql`
  query PageCategory($categories: [ID]) {
    categoryPosts: posts(
      first: 3
      where: { categoryIn: $categories, orderby: { field: DATE, order: DESC } }
    ) {
      edges {
        relatedPost: node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
          }
          link
          categories(where: { shouldOutputInFlatList: true }) {
            edges {
              node {
                link
                name
              }
            }
          }
          postId
          slug
          excerpt(format: RENDERED)
        }
      }
    }
  }
`;

export const GET_CATEGORY_ID = gql`
  query CategoryIdInfo($category: String!) {
    categoryInfo: categories(where: { slug: [$category] }) {
      edges {
        node {
          categoryId
        }
      }
    }
  }
`;

export const GET_CATEGORY_INFO = gql`
  query CategoryInfo($category: String!, $cursor: String!) {
    postData: posts(
      after: $cursor
      where: {
        taxQuery: {
          relation: OR
          taxArray: {
            taxonomy: CATEGORY
            terms: [$category]
            operator: IN
            field: SLUG
            includeChildren: true
          }
        }
        orderby: { field: DATE, order: DESC }
      }
    ) {
      edges {
        node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            isVideo
          }
          link
          categories(where: { shouldOutputInFlatList: true }) {
            edges {
              node {
                link
                name
              }
            }
          }
          postId
          slug
          excerpt(format: RENDERED)
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export const GET_PAGE_INFO = gql`
  query CurrentPost($slug: String!) {
    podcasts: menus(where: { slug: "podcasts" }) {
      nodes {
        menuItems {
          nodes {
            label
            url
            childItems {
              nodes {
                url
                label
              }
            }
          }
        }
      }
    }
    post: postBy(slug: $slug) {
      title(format: RENDERED)
      content(format: RENDERED)
      excerpt(format: RENDERED)
      link
      slug
      categories(where: { shouldOutputInFlatList: true }) {
        edges {
          node {
            link
            name
            categoryId
          }
        }
      }
      postDetails {
        youtubeId
        showPodcasts
        vimeoId
        embedUrl
        isVideo
        hidePageThumbnail
        pollForUpdates
        postHeader {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        videoImage {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        relatedPosts {
          relatedPost {
            ... on Post {
              title(format: RENDERED)
              postDetails {
                videoImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                postHeader {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
              }
              link
              categories(where: { shouldOutputInFlatList: true }) {
                edges {
                  node {
                    link
                    name
                  }
                }
              }
              postId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
        postEvents {
          relatedEvent {
            ... on Event {
              id
              title
              eventDetails {
                eventDates {
                  endTime
                  startTime
                }
                eventImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                venue
                webAddress
                eventPrice
                externalImage
              }
              link
              eventId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
      }
    }
  }
`;

// Keep optional custom fields out of GET_PAGE_INFO. WordPress rejects an
// entire operation when a queried field is not registered, which would blank
// every article during a staggered backend/frontend rollout.
export const GET_POST_HEADER_IMAGE_SIZE = gql`
  query PostHeaderImageSize($slug: String!) {
    post: postBy(slug: $slug) {
      headerImageSize
    }
  }
`;

export const GET_ARTICLES = gql`
  query ArticlesInfo($cursor: String!) {
    postData: posts(
      after: $cursor
      where: {
        orderby: { field: DATE, order: DESC }
        metaQuery: {
          metaArray: [{ key: "is_video", value: "0", compare: EQUAL_TO }]
        }
      }
    ) {
      edges {
        node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
          }
          link
          categories(where: { shouldOutputInFlatList: true }) {
            edges {
              node {
                link
                name
              }
            }
          }
          postId
          slug
          excerpt(format: RENDERED)
          content(format: RENDERED)
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export const GET_ALL_MAGAZINES = gql`
  query MagazineList($cursor: String!) {
    magazineData: magazines(after: $cursor) {
      edges {
        node {
          magazineId
          link
          slug
          title
          magazineDetail {
            coverImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
          }
        }
      }
      pageInfo {
        endCursor
      }
    }
    pageData: pageBy(uri: "magazines") {
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
  }
`;

export const GET_MAGAZINE_INFO = gql`
  query MagazineInfo($slug: String!) {
    magazine: magazineBy(slug: $slug) {
      magazineId
      link
      slug
      title
      content
      magazineDetail {
        coverImage {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        magazinePost {
          post {
            ... on Post {
              id
              title(format: RENDERED)
              postDetails {
                videoImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                postHeader {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
              }
              link
              categories(where: { shouldOutputInFlatList: true }) {
                edges {
                  node {
                    link
                    name
                  }
                }
              }
              postId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
      }
    }
    pageData: pageBy(uri: "magazines") {
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
  }
`;

export const GET_EVENTS_CATEGORIES = gql`
  query EventCategories($limit: Int!) {
    categories: eventCategories(
      first: $limit
      where: { shouldOutputInFlatList: true }
    ) {
      edges {
        node {
          slug
          name
          link
          eventCategoryId
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export const GET_LIVE_VIDEOS = gql`
  query LiveVideos(
    $keyEnd: String!
    $compareEnd: String!
    $keyStart: String!
    $compareStart: String!
  ) {
    liveVideos: videos(
      where: {
        metaQuery: {
          relation: AND
          metaArray: [
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              value: $compareEnd
              key: $keyEnd
            }
            {
              compare: LESS_THAN_OR_EQUAL_TO
              value: $compareStart
              key: $keyStart
            }
          ]
        }
      }
    ) {
      edges {
        node {
          title(format: RENDERED)
          content(format: RENDERED)
          temporaryLink {
            url
            endDate
            displayDate
            startDate
            showTime
            bannerTitle
            bannerBackground
            bannerTextColor
          }
        }
      }
    }
  }
`;

export const GET_CURRENT_EVENTS = gql`
  query allEvents($keyEnd: String!, $dayEnd: String!) {
    currentEvents: events(
      first: 5
      where: {
        metaQuery: {
          relation: AND
          metaArray: [
            { compare: GREATER_THAN_OR_EQUAL_TO, value: $dayEnd, key: $keyEnd }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              value: "1"
              key: "event_dates"
            }
          ]
        }
        orderby: { field: DATE, order: ASC }
      }
    ) {
      edges {
        node {
          title
          link
        }
      }
    }
  }
`;

export const GET_EVENTS_BY_DAY = gql`
  query EventDayInfo($keyEnd: String!, $dayEnd: String!, $cursor: String!) {
    matchEvent: events(
      after: $cursor
      where: {
        metaQuery: {
          metaArray: [
            { compare: GREATER_THAN_OR_EQUAL_TO, value: $dayEnd, key: $keyEnd }
            {
              compare: GREATER_THAN_OR_EQUAL_TO
              value: "1"
              key: "event_dates"
            }
          ]
        }
        orderby: { field: DATE, order: ASC }
      }
    ) {
      nodes {
        title(format: RENDERED)
        link
        eventId
        eventDetails {
          eventDates {
            endTime
            startTime
          }
          eventImage {
            medium: sourceUrl(size: MEDIUM)
            large: sourceUrl(size: MEDIUM_LARGE)
          }
          venue
          webAddress
          eventPrice
          externalImage
        }
        eventId
        slug
        excerpt(format: RENDERED)
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
    pageData: pageBy(uri: "events") {
      feedDesign {
        newRowLayout {
          rowLayout
          displayType
        }
        defaultDisplayType
        defaultRowLayout
      }
    }
  }
`;

export const GET_EVENT_INFO = gql`
  query EventInfo($uri: String!) {
    eventData: eventBy(uri: $uri) {
      title
      content
      link
      slug
      eventDetails {
        eventDates {
          endTime
          startTime
        }
        eventImage {
          medium: sourceUrl(size: MEDIUM)
          large: sourceUrl(size: MEDIUM_LARGE)
        }
        venue
        webAddress
        eventPrice
        externalImage
        eventPosts {
          eventPost {
            ... on Post {
              id
              title(format: RENDERED)
              excerpt(format: RENDERED)
              slug
              postDetails {
                videoImage {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                postHeader {
                  medium: sourceUrl(size: MEDIUM)
                  large: sourceUrl(size: MEDIUM_LARGE)
                }
                isVideo
              }
              link
              categories(where: { shouldOutputInFlatList: true }) {
                edges {
                  node {
                    link
                    name
                  }
                }
              }
              postId
              slug
              excerpt(format: RENDERED)
            }
          }
        }
      }
    }
  }
`;

export const GET_SEARCH_RESULTS = gql`
  query SearchResults($search: String!, $cursor: String!) {
    postData: posts(after: $cursor, where: { search: $search }) {
      edges {
        node {
          title(format: RENDERED)
          postDetails {
            videoImage {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            postHeader {
              medium: sourceUrl(size: MEDIUM)
              large: sourceUrl(size: MEDIUM_LARGE)
            }
            isVideo
          }
          link
          categories(where: { shouldOutputInFlatList: true }) {
            edges {
              node {
                link
                name
              }
            }
          }
          postId
          slug
          excerpt(format: RENDERED)
        }
      }
      pageInfo {
        endCursor
      }
    }
  }
`;

export const GET_PAGE_TEMPLATE = gql`
  query PageTemplate($uri: String!) {
    pageInfo: pageBy(uri: $uri) {
      content(format: RENDERED)
      title
      link
      pageTemplate
      contact {
        address
        directions
        faxNumber
        opportunities
        phoneNumber
      }
      about {
        phoneNumber
        address
        faxNumber
        tvProviders {
          provider
          channel
        }
        team {
          email
          name
          position
        }
        videoId
      }
    }
  }
`;
