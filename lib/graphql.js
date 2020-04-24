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
