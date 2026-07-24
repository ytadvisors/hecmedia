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
for slug in header footer social podcasts; do
  wpcli menu create "$slug" || true
done
wpcli menu item add-custom header "Home" "http://localhost:8091/" || true
wpcli menu item add-custom header "Programs" "http://localhost:8091/programs" || true
wpcli menu item add-custom footer "About" "http://localhost:8091/about" || true
wpcli menu item add-custom social "Facebook" "https://facebook.com/hectv" || true

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

# Rail promo — image_id 1 is the placeholder auto-created by WordPress on
# fresh installs; any valid positive int is acceptable for fixture purposes.
wpcli option set hectv_rail_promo \
  '{"image_id":1,"url":"https://hecmedia.org/for-educators","alt":"For Educators"}' \
  --format=json || true

# Featured video IDs — reference the seeded post IDs (use real IDs from earlier
# wpcli post create steps; fall back to any existing post ID if not present).
FV_POST_ID=$(wpcli post list --post_type=post --name=dev-seed-post-1 --field=ID 2>/dev/null || true)
if [ -n "$FV_POST_ID" ]; then
  wpcli option set hectv_featured_videos "[${FV_POST_ID}]" --format=json || true
fi

# Top-bar CTAs (feature g fixture: SUBSCRIBE / SUPPORT / GET INVOLVED)
wpcli option set hectv_topbar_ctas \
  '[{"label":"Subscribe","url":"https://hecmedia.org/subscribe","style":"primary"},{"label":"Support","url":"https://hecmedia.org/support","style":"secondary"},{"label":"Get Involved","url":"https://hecmedia.org/get-involved","style":"tertiary"}]' \
  --format=json || true

echo "== done. Verify with:"
echo "   curl -fsS http://localhost:8091/wp-json/ | head -c 200"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ generalSettings { url } }\"}'"
echo "   curl -fsS http://localhost:8091/wp-json/hectv/v1/site-options"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ hectvSiteOptions { railPromo { image { id sourceUrl altText } url alt } } topbarCtas { label url style } featuredVideos { id title } }\"}'"
