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
wpcli post create \
  --post_type=page \
  --post_title="Home" \
  --post_status=publish \
  --post_content="Fixture home page." || true

echo "== done. Verify with:"
echo "   curl -fsS http://localhost:8091/wp-json/ | head -c 200"
echo "   curl -fsS http://localhost:8091/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{ generalSettings { url } }\"}'"
