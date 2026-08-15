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
              categories {
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
          categories {
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
        categoryName: "spotlight"
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
  }
`;

/**
 * Footer navigation is loaded independently from GET_LAYOUT so an empty or
 * missing footer menu cannot blank spotlight/home data, and so the Footer
 * component always has an explicit GraphQL source for its links.
 *
 * Prefers the classic menu slug "footer" (Appearance → Menus → Footer).
 */
export const GET_FOOTER_MENU = gql`
  query FooterMenu {
    footer: menus(where: { slug: "footer" }) {
      edges {
        node {
          name
          slug
          menuItems {
            edges {
              node {
                label
                url
                path
                parentDatabaseId
                childItems {
                  edges {
                    node {
                      label
                      url
                      path
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
`;

/**
 * Social icons menu (slug: social). Isolated like footer/header.
 */
export const GET_SOCIAL_MENU = gql`
  query SocialMenu {
    social: menus(where: { slug: "social" }) {
      edges {
        node {
          name
          slug
          menuItems {
            edges {
              node {
                label
                url
                path
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Modern WPGraphQL exposes assigned navigation through the root menuItems
 * connection. Keep it isolated so a menu configuration problem cannot
 * invalidate the rest of the site shell.
 */
export const GET_HEADER_MENU = gql`
  query HeaderMenu {
    # The editorial PRIMARY menu is intentionally bounded at 100 entries. Its
    # descendants are returned through childItems; paginate if roots approach 100.
    # Prefer path (site-relative) over url (absolute WP host) when mapping links.
    header: menuItems(first: 100, where: { location: PRIMARY }) {
      edges {
        node {
          label
          url
          path
          parentDatabaseId
          childItems {
            edges {
              node {
                url
                path
                label
                parentDatabaseId
                childItems {
                  edges {
                    node {
                      url
                      path
                      label
                      parentDatabaseId
                      childItems {
                        edges {
                          node {
                            url
                            path
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
 * Legacy WPGraphQL exposes navigation through menus rather than the root
 * location-filtered menuItems connection. Keep this operation isolated from
 * GET_LAYOUT so either schema can fail without blanking the site shell.
 */
export const GET_LEGACY_HEADER_MENU = gql`
  query LegacyHeaderMenu {
    header: menus(where: { slug: "header" }) {
      edges {
        node {
          menuItems {
            edges {
              node {
                label
                url
                path
                childItems {
                  edges {
                    node {
                      url
                      path
                      label
                      childItems {
                        edges {
                          node {
                            url
                            path
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
  }
`;

/**
 * Subscribe / Support (and other top-bar CTAs) come from the WP menu location
 * HEADER_ACTIONS (Appearance → Menus → Header Actions). Isolated so a missing
 * location enum on older schemas cannot blank the site shell.
 *
 * Prefer path (site-relative) over absolute url so Next links stay on the
 * frontend host, not staging-wp.hectv.org.
 */
export const GET_HEADER_ACTIONS_MENU = gql`
  query HeaderActionsMenu {
    headerActions: menuItems(first: 10, where: { location: HEADER_ACTIONS }) {
      edges {
        node {
          label
          url
          path
          cssClasses
          parentDatabaseId
        }
      }
    }
  }
`;

/**
 * Optional custom CTA field (hectv_topbar_ctas option). Kept as a fallback when
 * the HEADER_ACTIONS menu is empty or unassigned. WordPress rejects an entire
 * operation when a queried field is not registered, so this stays isolated.
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
 * Settings → HEC Site Settings (canonical CMS). Isolated so a missing field on
 * older schemas cannot blank the site shell.
 *
 * Core chrome only: maxVideos, forEducators, trendingPosts. Headings and
 * mobileDisplay live in GET_HEC_SITE_PRESENTATION so a pre-WP#52 or partial
 * schema degrades only titles/mobile order — not trending posts / educators.
 */
export const GET_HEC_SITE_SETTINGS = gql`
  query HecSiteSettings {
    trendingSettings {
      maxVideos
    }
    forEducators {
      label
      url
      image {
        sourceUrl
        mediaItemUrl
        altText
      }
    }
    trendingPosts {
      title(format: RENDERED)
      link
      postId: databaseId
      postDetails {
        isVideo
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
        node {
          sourceUrl(size: MEDIUM)
        }
      }
    }
  }
`;

/**
 * Optional presentation fields from the same trendingSettings object. Isolated
 * like GET_NEWSLETTER_SETTINGS so missing headings/mobileDisplay cannot fail
 * the whole HEC chrome query.
 */
export const GET_HEC_SITE_PRESENTATION = gql`
  query HecSitePresentation {
    trendingSettings {
      trendingTitle
      spotlightTitle
      mobileDisplay
    }
  }
`;

/**
 * Newsletter settings stay isolated so older WordPress schemas fail closed to
 * CAPTCHA-on without affecting the rest of the newsletter page.
 */
export const GET_NEWSLETTER_SETTINGS = gql`
  query NewsletterSettings {
    newsletterSettings {
      captchaEnabled
    }
  }
`;

/**
 * Legacy staging presentation blob (spotlight title, footer rail links,
 * optional trendingPostIds, and the editor-controlled mobileRailFirst flag).
 * Kept as a fallback when GET_HEC_SITE_SETTINGS is unavailable or incomplete;
 * Layout consumes mobileRailFirst from this existing CMS contract.
 */
export const GET_HECTV_SITE_CONTENT = gql`
  query HectvSiteContent {
    hectvSiteContent {
      forEducators {
        imageUrl
        destinationUrl
      }
      trendingPostIds
      spotlightTitle
      footerLinks {
        label
        url
      }
      mobileRailFirst
    }
  }
`;

export const GET_CURATED_TRENDING_POSTS = gql`
  query CuratedTrendingPosts($ids: [ID], $first: Int = 5) {
    curatedTrendingPosts: posts(first: $first, where: { in: $ids }) {
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
          node {
            sourceUrl(size: MEDIUM)
          }
        }
        link
        postId
      }
    }
  }
`;

/**
 * Trending Now auto-populates from the newest video-type posts when the CMS
 * trendingPosts list is empty. $first comes from trendingSettings.maxVideos.
 * Kept out of GET_LAYOUT so a WPGraphQL validation error here can't blank the
 * rest of the page shell.
 */
export const GET_NEWEST_VIDEOS = gql`
  query NewestVideos($first: Int = 5) {
    newestVideos: posts(
      first: $first
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
          node {
            sourceUrl(size: MEDIUM)
          }
        }
        link
        postId
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
          categories {
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
      where: { categoryName: $category, orderby: { field: DATE, order: DESC } }
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
          categories {
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
      categories {
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
        postHero {
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
              categories {
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
          categories {
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
              categories {
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
          categories {
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
