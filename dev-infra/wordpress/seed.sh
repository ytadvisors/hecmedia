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
dev_seed_post_1_id=$(wpcli post list --post_type=post --name="dev-seed-post-1" --field=ID 2>/dev/null || true)
if [ -z "$dev_seed_post_1_id" ]; then
  dev_seed_post_1_id=$(wpcli post create \
    --post_type=post \
    --post_name="dev-seed-post-1" \
    --post_title="Dev Seed Post 1" \
    --post_status=publish \
    --post_category=programs \
    --post_content="Fixture content for local API development." \
    --porcelain)
fi

echo "== hectv-site-options fixtures (task #82688) =="
# (b) rail promo — real attachment created + attached so REST/GraphQL both
# resolve a sourceUrl, not just a bare ID.
wpcli eval "
\$upload = wp_upload_dir();
\$file = \$upload['path'] . '/hectv-rail-promo-fixture.png';
file_put_contents(\$file, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='));
\$existing = get_page_by_title('hectv-rail-promo-fixture', OBJECT, 'attachment');
if (\$existing) {
  \$id = \$existing->ID;
} else {
  \$id = wp_insert_attachment([ 'post_title' => 'hectv-rail-promo-fixture', 'post_mime_type' => 'image/png', 'post_status' => 'inherit' ], \$file);
  require_once ABSPATH . 'wp-admin/includes/image.php';
  wp_update_attachment_metadata(\$id, wp_generate_attachment_metadata(\$id, \$file));
  update_post_meta(\$id, '_wp_attachment_image_alt', 'FOR EDUCATORS notebook card');
}
update_option('hectv_rail_promo', [ 'image_id' => \$id, 'url' => 'http://localhost:8091/for-educators', 'alt' => 'FOR EDUCATORS notebook card' ]);
echo \$id;
"

# (c) featured videos — override auto-population with two real published posts.
wpcli eval "update_option('hectv_featured_videos', [ ${dev_seed_post_1_id} ]);"

# (g) topbar CTAs — SUBSCRIBE / SUPPORT / GET INVOLVED per the mock.
wpcli eval "
update_option('hectv_topbar_ctas', [
  [ 'label' => 'SUBSCRIBE',    'url' => 'http://localhost:8091/subscribe',    'style' => 'primary' ],
  [ 'label' => 'SUPPORT',      'url' => 'http://localhost:8091/support',      'style' => 'secondary' ],
  [ 'label' => 'GET INVOLVED', 'url' => 'http://localhost:8091/get-involved', 'style' => 'tertiary' ],
]);
"

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
