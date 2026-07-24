<?php
/**
 * Plugin Name: HECMedia Site Options
 * Plugin URI:  https://github.com/ytadvisors/hecmedia
 * Description: Registers hectv_rail_promo, hectv_featured_videos, hectv_topbar_ctas
 *              (site options) and hectv_header_image_size (post meta) over REST and
 *              WPGraphQL. Provides real CMS fields for features b/c/f/g instead of
 *              hardcoded values. See MOCK-GAP-SPEC.md §4 Gate 0.
 * Version:     1.0.0
 * Author:      YT Advisors / Jerome
 *
 * LOCAL DEV CANDIDATE — reviewed before any production install per
 * dev-infra/wordpress/RUNBOOK.md and the production approval boundary in
 * MOCK-GAP-SPEC.md §4.
 */

defined( 'ABSPATH' ) || exit;

define( 'HECTV_VALID_IMAGE_SIZES', [ 'small', 'medium', 'large', 'full' ] );
define( 'HECTV_VALID_CTA_STYLES',  [ 'primary', 'secondary', 'tertiary' ] );

// ──────────────────────────────────────────────────────────────────────────────
// 1. Post meta: hectv_header_image_size  (feature f)
// ──────────────────────────────────────────────────────────────────────────────

add_action( 'init', function () {
	register_post_meta( 'post', 'hectv_header_image_size', [
		'type'              => 'string',
		'description'       => 'Header image display size for article pages (small|medium|large|full). Omitted value resolves to full.',
		'single'            => true,
		'default'           => '',
		'sanitize_callback' => 'hectv_sanitize_image_size',
		'auth_callback'     => function ( $allowed, $meta_key, $post_id ) {
			return current_user_can( 'edit_post', $post_id );
		},
		'show_in_rest'      => true,
	] );
} );

function hectv_sanitize_image_size( $value ) {
	$key = sanitize_key( (string) $value );
	// Empty string is a legal stored value: means "use default (full)".
	return in_array( $key, HECTV_VALID_IMAGE_SIZES, true ) ? $key : '';
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. REST: GET + PUT /wp-json/hectv/v1/site-options
// ──────────────────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {
	register_rest_route( 'hectv/v1', '/site-options', [
		[
			'methods'             => WP_REST_Server::READABLE,
			'permission_callback' => '__return_true',
			'callback'            => 'hectv_rest_get_site_options',
		],
		[
			'methods'             => WP_REST_Server::EDITABLE,
			'permission_callback' => function () {
				return current_user_can( 'manage_options' );
			},
			'callback'            => 'hectv_rest_put_site_options',
			'args'                => [
				'railPromo'       => [ 'type' => 'object',  'required' => false ],
				'featuredVideoIds' => [ 'type' => 'array',   'required' => false, 'items' => [ 'type' => 'integer' ] ],
				'topbarCtas'      => [ 'type' => 'array',   'required' => false, 'items' => [ 'type' => 'object'  ] ],
			],
		],
	] );
} );

function hectv_rest_get_site_options() {
	return new WP_REST_Response( [
		'railPromo'        => hectv_get_rail_promo(),
		'featuredVideoIds' => hectv_get_featured_video_ids(),
		'topbarCtas'       => hectv_get_topbar_ctas(),
	], 200 );
}

function hectv_rest_put_site_options( WP_REST_Request $req ) {
	$errors = [];

	if ( $req->has_param( 'railPromo' ) ) {
		$r = hectv_save_rail_promo( $req->get_param( 'railPromo' ) );
		if ( is_wp_error( $r ) ) {
			$errors['railPromo'] = $r->get_error_message();
		}
	}
	if ( $req->has_param( 'featuredVideoIds' ) ) {
		$r = hectv_save_featured_video_ids( $req->get_param( 'featuredVideoIds' ) );
		if ( is_wp_error( $r ) ) {
			$errors['featuredVideoIds'] = $r->get_error_message();
		}
	}
	if ( $req->has_param( 'topbarCtas' ) ) {
		$r = hectv_save_topbar_ctas( $req->get_param( 'topbarCtas' ) );
		if ( is_wp_error( $r ) ) {
			$errors['topbarCtas'] = $r->get_error_message();
		}
	}

	if ( ! empty( $errors ) ) {
		// No partial writes — reject the whole request if any field fails validation.
		return new WP_REST_Response( [ 'errors' => $errors ], 422 );
	}

	return hectv_rest_get_site_options();
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. Rail promo helpers  (feature b)
// ──────────────────────────────────────────────────────────────────────────────

function hectv_get_rail_promo() {
	$raw = get_option( 'hectv_rail_promo', null );
	if ( ! is_array( $raw ) ) {
		return null;
	}
	$image_id = absint( $raw['image_id'] ?? 0 );
	return [
		'imageId' => $image_id > 0 ? $image_id : null,
		'url'     => esc_url_raw( $raw['url'] ?? '' ),
		'alt'     => sanitize_text_field( $raw['alt'] ?? '' ),
	];
}

function hectv_save_rail_promo( $data ) {
	if ( ! is_array( $data ) ) {
		return new WP_Error( 'invalid_rail_promo', 'railPromo must be an object with imageId, url, and alt.' );
	}
	$image_id = absint( $data['imageId'] ?? 0 );
	if ( $image_id <= 0 ) {
		return new WP_Error( 'invalid_rail_promo', 'railPromo.imageId must be a positive integer.' );
	}
	$url = esc_url_raw( $data['url'] ?? '' );
	if ( empty( $url ) ) {
		return new WP_Error( 'invalid_rail_promo', 'railPromo.url must be a valid URL.' );
	}
	update_option( 'hectv_rail_promo', [
		'image_id' => $image_id,
		'url'      => $url,
		'alt'      => sanitize_text_field( $data['alt'] ?? '' ),
	] );
	return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Featured video ID helpers  (feature c)
// ──────────────────────────────────────────────────────────────────────────────

function hectv_get_featured_video_ids() {
	$raw = get_option( 'hectv_featured_videos', [] );
	if ( ! is_array( $raw ) ) {
		return [];
	}
	return array_values( array_filter( array_map( 'absint', $raw ) ) );
}

function hectv_save_featured_video_ids( $ids ) {
	if ( ! is_array( $ids ) ) {
		return new WP_Error( 'invalid_featured_videos', 'featuredVideoIds must be an array of integers.' );
	}
	$clean = array_values( array_unique( array_filter( array_map( 'absint', $ids ) ) ) );
	if ( count( $clean ) > 12 ) {
		return new WP_Error( 'invalid_featured_videos', 'featuredVideoIds may not exceed 12 entries.' );
	}
	update_option( 'hectv_featured_videos', $clean );
	return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. Top-bar CTA helpers  (feature g)
// ──────────────────────────────────────────────────────────────────────────────

function hectv_sanitize_cta_row( $row ) {
	if ( ! is_array( $row ) ) {
		return null;
	}
	$label = sanitize_text_field( $row['label'] ?? '' );
	$url   = esc_url_raw( $row['url'] ?? '' );
	$style = sanitize_key( $row['style'] ?? 'primary' );
	if ( empty( $label ) || empty( $url ) ) {
		return null; // drop incomplete rows per spec
	}
	if ( ! in_array( $style, HECTV_VALID_CTA_STYLES, true ) ) {
		$style = 'primary';
	}
	return [ 'label' => $label, 'url' => $url, 'style' => $style ];
}

function hectv_get_topbar_ctas() {
	$raw = get_option( 'hectv_topbar_ctas', [] );
	if ( ! is_array( $raw ) ) {
		return [];
	}
	return array_values( array_filter( array_map( 'hectv_sanitize_cta_row', $raw ) ) );
}

function hectv_save_topbar_ctas( $ctas ) {
	if ( ! is_array( $ctas ) ) {
		return new WP_Error( 'invalid_topbar_ctas', 'topbarCtas must be an array.' );
	}
	$clean = array_values( array_filter( array_map( 'hectv_sanitize_cta_row', $ctas ) ) );
	if ( count( $clean ) > 5 ) {
		return new WP_Error( 'invalid_topbar_ctas', 'topbarCtas may not exceed 5 entries.' );
	}
	update_option( 'hectv_topbar_ctas', $clean );
	return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// 6. WPGraphQL schema extension
// ──────────────────────────────────────────────────────────────────────────────

add_action( 'graphql_register_types', function () {

	register_graphql_object_type( 'HectvRailPromo', [
		'description' => 'Promotional card shown in the right rail (feature b).',
		'fields'      => [
			'imageId' => [ 'type' => 'Int',    'description' => 'WordPress attachment ID for the promo image.' ],
			'url'     => [ 'type' => 'String', 'description' => 'Destination URL for the promo card link.'    ],
			'alt'     => [ 'type' => 'String', 'description' => 'Alt text for the promo image.'              ],
		],
	] );

	register_graphql_object_type( 'HectvTopbarCta', [
		'description' => 'A single customizable button in the top bar (feature g).',
		'fields'      => [
			'label' => [ 'type' => 'String', 'description' => 'Button label.'             ],
			'url'   => [ 'type' => 'String', 'description' => 'Button destination URL.'   ],
			'style' => [ 'type' => 'String', 'description' => 'Visual style variant.'     ],
		],
	] );

	register_graphql_object_type( 'HectvSiteOptions', [
		'description' => 'Site-wide CMS options for HEC-TV.',
		'fields'      => [
			'railPromo'        => [
				'type'        => 'HectvRailPromo',
				'description' => 'Rail promotional card (feature b).',
				'resolve'     => function () { return hectv_get_rail_promo(); },
			],
			'featuredVideoIds' => [
				'type'        => [ 'list_of' => 'Int' ],
				'description' => 'Manually featured video post IDs, in display order (feature c).',
				'resolve'     => function () { return hectv_get_featured_video_ids(); },
			],
			'topbarCtas'       => [
				'type'        => [ 'list_of' => 'HectvTopbarCta' ],
				'description' => 'Customizable top-bar CTA buttons (feature g).',
				'resolve'     => function () { return hectv_get_topbar_ctas(); },
			],
		],
	] );

	register_graphql_field( 'RootQuery', 'hectvSiteOptions', [
		'type'        => 'HectvSiteOptions',
		'description' => 'Site-wide HEC-TV CMS options.',
		'resolve'     => function () { return []; }, // field resolvers live on the type
	] );

	// headerImageSize on Post  (feature f)
	register_graphql_field( 'Post', 'headerImageSize', [
		'type'        => 'String',
		'description' => 'Header image display size for this article (small|medium|large|full). Absent meta resolves to full.',
		'resolve'     => function ( $post ) {
			$post_id = is_object( $post ) ? ( $post->databaseId ?? ( $post->ID ?? 0 ) ) : ( $post['databaseId'] ?? 0 );
			$value   = get_post_meta( (int) $post_id, 'hectv_header_image_size', true );
			return $value !== '' ? $value : 'full';
		},
	] );
} );

// ──────────────────────────────────────────────────────────────────────────────
// 7. wp-admin Settings page (nonce-protected, capability-checked)
// ──────────────────────────────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
	add_options_page(
		'HEC-TV Site Options',
		'HEC-TV Options',
		'manage_options',
		'hectv-site-options',
		'hectv_render_admin_page'
	);
} );

add_action( 'admin_init', function () {
	register_setting( 'hectv_site_options_group', 'hectv_rail_promo',      [ 'sanitize_callback' => 'hectv_admin_sanitize_rail_promo'      ] );
	register_setting( 'hectv_site_options_group', 'hectv_featured_videos', [ 'sanitize_callback' => 'hectv_admin_sanitize_featured_videos' ] );
	register_setting( 'hectv_site_options_group', 'hectv_topbar_ctas',     [ 'sanitize_callback' => 'hectv_admin_sanitize_topbar_ctas'     ] );
} );

function hectv_admin_sanitize_rail_promo( $data ) {
	if ( ! is_array( $data ) ) {
		return get_option( 'hectv_rail_promo', [] );
	}
	$image_id = absint( $data['image_id'] ?? 0 );
	$url      = esc_url_raw( $data['url'] ?? '' );
	if ( $image_id <= 0 || empty( $url ) ) {
		add_settings_error( 'hectv_rail_promo', 'invalid', 'Rail promo requires a valid attachment ID and URL.' );
		return get_option( 'hectv_rail_promo', [] );
	}
	return [ 'image_id' => $image_id, 'url' => $url, 'alt' => sanitize_text_field( $data['alt'] ?? '' ) ];
}

function hectv_admin_sanitize_featured_videos( $data ) {
	if ( ! is_string( $data ) ) {
		return get_option( 'hectv_featured_videos', [] );
	}
	$ids = array_values( array_unique( array_filter( array_map( 'absint', explode( ',', $data ) ) ) ) );
	if ( count( $ids ) > 12 ) {
		add_settings_error( 'hectv_featured_videos', 'invalid', 'Featured videos may not exceed 12 entries.' );
		return get_option( 'hectv_featured_videos', [] );
	}
	return $ids;
}

function hectv_admin_sanitize_topbar_ctas( $data ) {
	if ( ! is_array( $data ) ) {
		return get_option( 'hectv_topbar_ctas', [] );
	}
	$clean = array_values( array_filter( array_map( 'hectv_sanitize_cta_row', $data ) ) );
	if ( count( $clean ) > 5 ) {
		add_settings_error( 'hectv_topbar_ctas', 'invalid', 'Top-bar CTAs may not exceed 5 entries.' );
		return get_option( 'hectv_topbar_ctas', [] );
	}
	return $clean;
}

function hectv_render_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Insufficient permissions.' );
	}
	settings_errors( 'hectv_site_options_group' );
	$promo   = hectv_get_rail_promo() ?? [];
	$vid_csv = implode( ',', hectv_get_featured_video_ids() );
	$ctas    = hectv_get_topbar_ctas();
	?>
	<div class="wrap">
		<h1>HEC-TV Site Options</h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'hectv_site_options_group' ); ?>

			<h2>Rail Promo (feature b)</h2>
			<table class="form-table">
				<tr><th scope="row">Image Attachment ID</th><td>
					<input type="number" name="hectv_rail_promo[image_id]" value="<?php echo esc_attr( $promo['imageId'] ?? '' ); ?>" min="1" />
				</td></tr>
				<tr><th scope="row">Destination URL</th><td>
					<input type="url" name="hectv_rail_promo[url]" value="<?php echo esc_attr( $promo['url'] ?? '' ); ?>" class="regular-text" />
				</td></tr>
				<tr><th scope="row">Alt Text</th><td>
					<input type="text" name="hectv_rail_promo[alt]" value="<?php echo esc_attr( $promo['alt'] ?? '' ); ?>" class="regular-text" />
				</td></tr>
			</table>

			<h2>Featured Video IDs (feature c)</h2>
			<table class="form-table">
				<tr><th scope="row">Post IDs (comma-separated)</th><td>
					<input type="text" name="hectv_featured_videos" value="<?php echo esc_attr( $vid_csv ); ?>" class="regular-text" placeholder="e.g. 42,17,99" />
					<p class="description">Up to 12, ordered. Leave blank to auto-populate from newest videos.</p>
				</td></tr>
			</table>

			<h2>Top-Bar CTAs (feature g)</h2>
			<table class="form-table">
				<?php for ( $i = 0; $i < 5; $i++ ) :
					$cta = $ctas[ $i ] ?? [ 'label' => '', 'url' => '', 'style' => 'primary' ]; ?>
				<tr><th scope="row">CTA <?php echo $i + 1; ?></th><td>
					<input type="text" name="hectv_topbar_ctas[<?php echo $i; ?>][label]" value="<?php echo esc_attr( $cta['label'] ); ?>" placeholder="Label" />
					<input type="url"  name="hectv_topbar_ctas[<?php echo $i; ?>][url]"   value="<?php echo esc_attr( $cta['url']   ); ?>" placeholder="https://…" />
					<select name="hectv_topbar_ctas[<?php echo $i; ?>][style]">
						<?php foreach ( HECTV_VALID_CTA_STYLES as $s ) : ?>
							<option value="<?php echo esc_attr( $s ); ?>" <?php selected( $cta['style'], $s ); ?>><?php echo esc_html( ucfirst( $s ) ); ?></option>
						<?php endforeach; ?>
					</select>
				</td></tr>
				<?php endfor; ?>
			</table>

			<?php submit_button( 'Save HEC-TV Options' ); ?>
		</form>
	</div>
	<?php
}
