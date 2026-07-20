# Staging navigation preview

This preview groups the existing WordPress/GraphQL `header` menu into five
top-level dropdowns without writing to WordPress. It is enabled only when
`HECMEDIA_NAVIGATION_PREVIEW=true`, which the protected staging workflow sets;
production remains CMS-driven and unchanged.

| Preview item      | CMS item matching                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Home              | `Home` label or `/` URL                                                                     |
| Watch             | program, schedule, watch, video, spotlight, magazine                                        |
| Learn & Explore   | education, educator, learn, school, classroom, arts, culture                                |
| Connect           | event, community, about, contact, news, story; unmatched links are retained here for review |
| Support HEC Media | donate, support, underwriting, sponsor, membership, give                                    |

Every source menu item retains its current URL. Existing child links are
flattened into the selected preview dropdown so the current one-level GraphQL
menu query remains sufficient. Jayne can approve or revise the matching rules
before the same arrangement is made in the WordPress `header` menu.
