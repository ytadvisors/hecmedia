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
# The header fixture mirrors the approved mock exactly.  Parent/child IDs are
# intentional: this is the CMS tree the app consumes, including a true second
# dropdown level under About -> Our Organization -> Leadership.
for item_id in $(wpcli menu item list header --format=ids | tr ' ' '\n' | sort -rn); do
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

echo "== done. Verify with:"
echo "   curl -fsS http://localhost:8091/wp-json/ | head -c 200"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ generalSettings { url } }\"}'"
