#!/usr/bin/env bash
# Seeds the MBA-local WordPress dev instance (task #82651) with deterministic
# fixture content — NOT a production export. No production credentials, dumps,
# or content are used anywhere in this script.
#
# Run from dev-infra/wordpress/ after `docker compose up -d` and once the
# `wordpress` container is healthy:
#   ./seed.sh
set -euo pipefail
cd "$(dirname "$0")"

wpcli() { docker compose run --rm wpcli "$@"; }

echo "== waiting for db/wordpress health =="
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' hecmedia-dev-wp 2>/dev/null || echo "starting")
  [ "$status" = "healthy" ] && break
  sleep 5
done

echo "== core install (idempotent) =="
if ! wpcli core is-installed 2>/dev/null; then
  wpcli core install \
    --url="http://localhost:8091" \
    --title="HECMedia Dev" \
    --admin_user="devadmin" \
    --admin_password="devadmin" \
    --admin_email="dev@example.com" \
    --skip-email
fi

echo "== plugins: wp-graphql, wp-api-menus =="
wpcli plugin install wp-graphql --activate
wpcli plugin install wp-api-menus --activate

echo "== permalinks (required for wp-json routes to resolve) =="
wpcli rewrite structure '/%postname%/' --hard
wpcli rewrite flush --hard

echo "== menus =="
for slug in header footer social podcasts bottomnav; do
  wpcli menu create "$slug" || true
done
for slug in header footer social podcasts bottomnav; do
  wpcli menu location assign "$slug" "$slug"
done
# The header fixture mirrors the approved mock exactly.  Parent/child IDs are
# intentional: this is the CMS tree the app consumes, including a true second
# dropdown level under About -> Our Organization -> Leadership.
for item_id in $(wpcli menu item list header --format=ids | tr ' ' '\n' | sort -rn); do
  wpcli menu item delete "$item_id"
done
for item_id in $(wpcli menu item list bottomnav --format=ids | tr ' ' '\n' | sort -rn); do
  wpcli menu item delete "$item_id"
done
about_id=$(wpcli menu item add-custom header "ABOUT" "http://localhost:8091/about" --porcelain)
organization_id=$(wpcli menu item add-custom header "Our Organization" "http://localhost:8091/about/organization" --parent-id="$about_id" --porcelain)
wpcli menu item add-custom header "Leadership" "http://localhost:8091/about/leadership" --parent-id="$organization_id" --porcelain >/dev/null
programs_id=$(wpcli menu item add-custom header "PROGRAMS" "http://localhost:8091/programs" --porcelain)
wpcli menu item add-custom header "Classroom" "http://localhost:8091/programs/classroom" --parent-id="$programs_id" --porcelain >/dev/null
production_id=$(wpcli menu item add-custom header "PRODUCTION SERVICES" "http://localhost:8091/production-services" --porcelain)
wpcli menu item add-custom header "Studio Rental" "http://localhost:8091/production-services/studio-rental" --parent-id="$production_id" --porcelain >/dev/null
watch_id=$(wpcli menu item add-custom header "WATCH NOW" "http://localhost:8091/watch" --porcelain)
wpcli menu item add-custom header "HEC-TV Spotlight" "http://localhost:8091/watch/spotlight" --parent-id="$watch_id" --porcelain >/dev/null
read_id=$(wpcli menu item add-custom header "READ NOW" "http://localhost:8091/read" --porcelain)
wpcli menu item add-custom header "Books" "http://localhost:8091/read/books" --parent-id="$read_id" --porcelain >/dev/null
wpcli menu item add-custom footer "About" "http://localhost:8091/about" || true
wpcli menu item add-custom social "Facebook" "https://facebook.com/hectv" || true
wpcli menu item add-custom bottomnav "Programs" "http://localhost:8091/programs" || true

echo "== categories + sample posts =="
wpcli term create category "Programs" --slug=programs || true
wpcli term create category "Events" --slug=events || true
wpcli post create \
  --post_type=post \
  --post_title="Dev Seed Post 1" \
  --post_status=publish \
  --post_category=programs \
  --post_content="Fixture content for local API development." || true

echo "== header-image-size acceptance fixtures =="
# These posts make every supported setting observable in the real browser.
# The final post intentionally has no meta value: it proves the default remains
# visually identical to an explicitly selected `full` image.
for size in small medium large full; do
  fixture_id=$(wpcli post list --post_type=post --name="header-image-size-${size}" --field=ID 2>/dev/null || true)
  if [ -z "$fixture_id" ]; then
    fixture_id=$(wpcli post create \
      --post_type=post \
      --post_name="header-image-size-${size}" \
      --post_title="Header Image Size ${size}" \
      --post_status=publish \
      --post_content="Deterministic header-image-size acceptance fixture." \
      --porcelain)
  fi
  wpcli post meta update "$fixture_id" hectv_header_image_size "$size"
done
default_fixture_id=$(wpcli post list --post_type=post --name="header-image-size-default" --field=ID 2>/dev/null || true)
if [ -z "$default_fixture_id" ]; then
  default_fixture_id=$(wpcli post create \
    --post_type=post \
    --post_name="header-image-size-default" \
    --post_title="Header Image Size Default" \
    --post_status=publish \
    --post_content="Default header-image-size acceptance fixture." \
    --porcelain)
fi
wpcli post meta delete "$default_fixture_id" hectv_header_image_size >/dev/null 2>&1 || true
wpcli post create \
  --post_type=page \
  --post_title="Home" \
  --post_status=publish \
  --post_content="Fixture home page." || true

echo "== hectv-site-options fixtures =="
# Seed fixture values for Gate 0 fields so curl/graphql/e2e tests pass
# without manual wp-admin interaction.

# Rail promo — use a real image attachment. Fresh WordPress commonly assigns
# ID 1 to the Hello World post, so post existence alone is not valid here.
RAIL_IMAGE_ID=$(wpcli post list --post_type=attachment --name=hec-rail-promo-fixture --field=ID 2>/dev/null || true)
if [ -z "$RAIL_IMAGE_ID" ]; then
  RAIL_IMAGE_ID=$(wpcli media import /fixtures/for-educators-rail-promo.png --title="For Educators Rail Promo" --porcelain)
  wpcli post update "$RAIL_IMAGE_ID" --post_name=hec-rail-promo-fixture >/dev/null
fi
wpcli option set hectv_rail_promo \
  "{\"image_id\":${RAIL_IMAGE_ID},\"url\":\"https://hecmedia.org/for-educators\",\"alt\":\"For Educators\"}" \
  --format=json || true

# Featured video IDs — seed one currently published post plus a post that was
# published when selected and then withdrawn. The read path must hide the latter.
FEATURED_PUBLISHED_ID=$(wpcli post list --post_type=post --name=featured-video-published --field=ID 2>/dev/null || true)
if [ -z "$FEATURED_PUBLISHED_ID" ]; then
  FEATURED_PUBLISHED_ID=$(wpcli post create --post_type=post --post_name=featured-video-published --post_title="Featured Video Published" --post_status=publish --post_content="Published featured-video fixture." --porcelain)
fi
wpcli post update "$FEATURED_PUBLISHED_ID" --post_status=publish >/dev/null
FEATURED_WITHDRAWN_ID=$(wpcli post list --post_type=post --name=featured-video-withdrawn --field=ID 2>/dev/null || true)
if [ -z "$FEATURED_WITHDRAWN_ID" ]; then
  FEATURED_WITHDRAWN_ID=$(wpcli post create --post_type=post --post_name=featured-video-withdrawn --post_title="Featured Video Withdrawn" --post_status=publish --post_content="Withdrawn featured-video fixture." --porcelain)
fi
wpcli post update "$FEATURED_WITHDRAWN_ID" --post_status=draft >/dev/null
FEATURED_PRIVATE_ID=$(wpcli post list --post_type=post --name=featured-video-private --field=ID 2>/dev/null || true)
if [ -z "$FEATURED_PRIVATE_ID" ]; then
  FEATURED_PRIVATE_ID=$(wpcli post create --post_type=post --post_name=featured-video-private --post_title="Featured Video Private" --post_status=publish --post_content="Private featured-video fixture." --porcelain)
fi
wpcli post update "$FEATURED_PRIVATE_ID" --post_status=private >/dev/null
wpcli option set hectv_featured_videos "[${FEATURED_PUBLISHED_ID},${FEATURED_WITHDRAWN_ID},${FEATURED_PRIVATE_ID}]" --format=json || true

# Regression guard: a normal post must never pass the rail-promo image validator.
wpcli eval "\$result = hectv_sanitize_rail_promo( ['image_id' => ${FEATURED_PUBLISHED_ID}, 'url' => 'https://hecmedia.org/'] ); if ( ! is_wp_error( \$result ) ) { fwrite( STDERR, 'Non-attachment rail promo was accepted.' ); exit( 1 ); }"

# Top-bar CTAs (feature g fixture: SUBSCRIBE / SUPPORT / GET INVOLVED)
wpcli option set hectv_topbar_ctas \
  '[{"label":"SUBSCRIBE","url":"https://hecmedia.org/subscribe","style":"primary"},{"label":"SUPPORT","url":"https://hecmedia.org/support","style":"secondary"},{"label":"GET INVOLVED","url":"https://hecmedia.org/get-involved","style":"tertiary"}]' \
  --format=json || true

echo "== done. Verify with:"
echo "   curl -fsS http://localhost:8091/wp-json/ | head -c 200"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ generalSettings { url } }\"}'"
echo "   curl -fsS http://localhost:8091/wp-json/hectv/v1/site-options"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ hectvSiteOptions { railPromo { image { id sourceUrl altText } url alt } } topbarCtas { label url style } featuredVideos { id title } }\"}'"
