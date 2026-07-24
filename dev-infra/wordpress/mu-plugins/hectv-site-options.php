<?php
/**
 * Plugin Name: HECMedia site options (hectv-site-options)
 * Description: Local-dev-owned replacement for the unavailable production ACF
 *              field registration (see dev-infra/wordpress/RUNBOOK.md and
 *              MOCK-GAP-SPEC.md §4 Gate 0). Registers real, native WordPress
 *              fields — a settings-page-editable options group plus a
 *              per-post meta field — so the app's REST/GraphQL contract for
 *              (b) rail promo, (c) manual featured videos, (f) header image
 *              size, and (g) topbar CTAs is backed by real code we own and
 *              can test, instead of the hardcoded values those features
 *              shipped with. This is NOT a clone of production's ACF schema
 *              or behavior — field names/shapes were designed from the app's
 *              own read requirements, not from the (unavailable) production
 *              source.
 *
 *              Build/verify target: LOCAL Docker WP only
 *              (dev-infra/wordpress/, worker-mba, 127.0.0.1:8091). Never
 *              install on prod-wp.hectv.org.
 */

define( 'HECTV_SITE_OPTIONS_GROUP', 'hectv_site_options' );
define( 'HECTV_RAIL_PROMO_OPTION', 'hectv_rail_promo' );
define( 'HECTV_FEATURED_VIDEOS_OPTION', 'hectv_featured_videos' );
define( 'HECTV_TOPBAR_CTAS_OPTION', 'hectv_topbar_ctas' );
define( 'HECTV_HEADER_IMAGE_SIZE_META', 'hectv_header_image_size' );
define( 'HECTV_HEADER_IMAGE_SIZES', [ 'small', 'medium', 'large', 'full' ] );
define( 'HECTV_TOPBAR_CTA_STYLES', [ 'primary', 'secondary', 'tertiary' ] );

/* -----------------------------------------------------------------------
 * Sanitizers / validators (shared by settings API, REST, and GraphQL input)
 * --------------------------------------------------------------------- */

function hectv_sanitize_rail_promo( $value ) {
	$value = is_array( $value ) ? $value : [];
	$image_id = isset( $value['image_id'] ) ? absint( $value['image_id'] ) : 0;
	$url      = isset( $value['url'] ) ? esc_url_raw( $value['url'] ) : '';

	if ( $image_id <= 0 || ! wp_attachment_is_image( $image_id ) || $url === '' ) {
		return new WP_Error(
			'hectv_invalid_rail_promo',
			'hectv_rail_promo requires an image attachment and a valid url.'
		);
	}

	return [
		'image_id' => $image_id,
		'url'      => $url,
		'alt'      => isset( $value['alt'] ) ? sanitize_text_field( $value['alt'] ) : '',
	];
}

function hectv_sanitize_featured_videos( $value ) {
	if ( $value === null ) {
		return [];
	}
	if ( ! is_array( $value ) ) {
		return new WP_Error( 'hectv_invalid_featured_videos', 'hectv_featured_videos must be an array of post IDs or null.' );
	}

	$ids = [];
	foreach ( $value as $raw_id ) {
		$id = absint( $raw_id );
		if ( $id > 0 && get_post_status( $id ) === 'publish' && ! in_array( $id, $ids, true ) ) {
			$ids[] = $id;
		}
	}

	return array_slice( $ids, 0, 12 );
}

function hectv_sanitize_topbar_ctas( $value ) {
	if ( ! is_array( $value ) ) {
		return new WP_Error( 'hectv_invalid_topbar_ctas', 'hectv_topbar_ctas must be an array.' );
	}

	$ctas = [];
	foreach ( $value as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$label = isset( $row['label'] ) ? sanitize_text_field( $row['label'] ) : '';
		$url   = isset( $row['url'] ) ? esc_url_raw( $row['url'] ) : '';
		$style = isset( $row['style'] ) ? sanitize_key( $row['style'] ) : '';

		// Drop incomplete rows rather than rejecting the whole write.
		if ( $label === '' || $url === '' || ! in_array( $style, HECTV_TOPBAR_CTA_STYLES, true ) ) {
			continue;
		}

		$ctas[] = compact( 'label', 'url', 'style' );
	}

	return array_slice( $ctas, 0, 5 );
}

function hectv_sanitize_header_image_size( $value ) {
	$value = sanitize_key( $value );
	return in_array( $value, HECTV_HEADER_IMAGE_SIZES, true ) ? $value : 'full';
}

/* -----------------------------------------------------------------------
 * Native storage: options (b, c, g) + post meta (f)
 * --------------------------------------------------------------------- */

add_action( 'init', function () {
	register_setting( HECTV_SITE_OPTIONS_GROUP, HECTV_RAIL_PROMO_OPTION, [
		'type'              => 'object',
		'sanitize_callback' => 'hectv_sanitize_rail_promo',
		'default'           => null,
		'show_in_rest'      => false, // exposed via the custom hectv/v1 route below, not core REST.
	] );

	register_setting( HECTV_SITE_OPTIONS_GROUP, HECTV_FEATURED_VIDEOS_OPTION, [
		'type'              => 'array',
		'sanitize_callback' => 'hectv_sanitize_featured_videos',
		'default'           => [],
		'show_in_rest'      => false,
	] );

	register_setting( HECTV_SITE_OPTIONS_GROUP, HECTV_TOPBAR_CTAS_OPTION, [
		'type'              => 'array',
		'sanitize_callback' => 'hectv_sanitize_topbar_ctas',
		'default'           => [],
		'show_in_rest'      => false,
	] );

	register_post_meta( 'post', HECTV_HEADER_IMAGE_SIZE_META, [
		'type'              => 'string',
		'single'            => true,
		'default'           => 'full',
		'show_in_rest'      => true,
		'sanitize_callback' => 'hectv_sanitize_header_image_size',
		'auth_callback'     => function ( $allowed, $meta_key, $post_id ) {
			return current_user_can( 'edit_post', $post_id );
		},
	] );
} );

/* -----------------------------------------------------------------------
 * Read helpers (shared by REST and GraphQL resolvers)
 * --------------------------------------------------------------------- */

function hectv_get_rail_promo() {
	$value = get_option( HECTV_RAIL_PROMO_OPTION, null );
	if ( ! is_array( $value ) || empty( $value['image_id'] ) || ! wp_attachment_is_image( $value['image_id'] ) ) {
		return null;
	}

	return [
		'image' => [
			'id'        => (int) $value['image_id'],
			'sourceUrl' => wp_get_attachment_url( $value['image_id'] ) ?: '',
			'altText'   => get_post_meta( $value['image_id'], '_wp_attachment_image_alt', true ) ?: '',
		],
		'url' => $value['url'],
		'alt' => $value['alt'] ?? '',
	];
}

function hectv_get_featured_video_ids() {
	$ids = get_option( HECTV_FEATURED_VIDEOS_OPTION, [] );
	if ( ! is_array( $ids ) ) {
		return [];
	}

	return array_values( array_filter( array_map( 'absint', $ids ), function ( $id ) {
		return $id > 0 && get_post_type( $id ) === 'post' && get_post_status( $id ) === 'publish';
	} ) );
}

function hectv_get_topbar_ctas() {
	$ctas = get_option( HECTV_TOPBAR_CTAS_OPTION, [] );
	return is_array( $ctas ) ? array_values( $ctas ) : [];
}

/* -----------------------------------------------------------------------
 * REST: GET/PUT /wp-json/hectv/v1/site-options
 * --------------------------------------------------------------------- */

add_action( 'rest_api_init', function () {
	register_rest_route( 'hectv/v1', '/site-options', [
		[
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => function () {
				return new WP_REST_Response( [
					'railPromo'       => hectv_get_rail_promo(),
					'featuredVideoIds' => hectv_get_featured_video_ids(),
					'topbarCtas'      => hectv_get_topbar_ctas(),
				], 200 );
			},
		],
		[
			'methods'             => 'PUT',
			'permission_callback' => function ( WP_REST_Request $request ) {
				$body = $request->get_json_params() ?: [];
				// Field-level authority per MOCK-GAP-SPEC.md §4 Gate 0:
				// railPromo/topbarCtas need manage_options; featuredVideoIds
				// needs edit_others_posts. Cookie auth enforces the WP nonce
				// automatically (rest_cookie_check_errors_authentication).
				if ( array_key_exists( 'railPromo', $body ) && ! current_user_can( 'manage_options' ) ) {
					return false;
				}
				if ( array_key_exists( 'topbarCtas', $body ) && ! current_user_can( 'manage_options' ) ) {
					return false;
				}
				if ( array_key_exists( 'featuredVideoIds', $body ) && ! current_user_can( 'edit_others_posts' ) ) {
					return false;
				}
				return true;
			},
			'callback' => function ( WP_REST_Request $request ) {
				$body   = $request->get_json_params() ?: [];
				$errors = [];

				if ( array_key_exists( 'railPromo', $body ) ) {
					$result = hectv_sanitize_rail_promo( $body['railPromo'] );
					if ( is_wp_error( $result ) ) {
						$errors['railPromo'] = $result->get_error_message();
					} else {
						update_option( HECTV_RAIL_PROMO_OPTION, $result );
					}
				}

				if ( array_key_exists( 'featuredVideoIds', $body ) ) {
					$result = hectv_sanitize_featured_videos( $body['featuredVideoIds'] );
					if ( is_wp_error( $result ) ) {
						$errors['featuredVideoIds'] = $result->get_error_message();
					} else {
						update_option( HECTV_FEATURED_VIDEOS_OPTION, $result );
					}
				}

				if ( array_key_exists( 'topbarCtas', $body ) ) {
					$result = hectv_sanitize_topbar_ctas( $body['topbarCtas'] );
					if ( is_wp_error( $result ) ) {
						$errors['topbarCtas'] = $result->get_error_message();
					} else {
						update_option( HECTV_TOPBAR_CTAS_OPTION, $result );
					}
				}

				if ( ! empty( $errors ) ) {
					// No partial writes for the fields that failed validation;
					// fields without errors above were already saved individually.
					return new WP_REST_Response( [ 'errors' => $errors ], 400 );
				}

				return new WP_REST_Response( [
					'railPromo'        => hectv_get_rail_promo(),
					'featuredVideoIds' => hectv_get_featured_video_ids(),
					'topbarCtas'       => hectv_get_topbar_ctas(),
				], 200 );
			},
		],
	] );
} );

/* -----------------------------------------------------------------------
 * WPGraphQL: hectvSiteOptions.railPromo, featuredVideos, topbarCtas,
 * Post.headerImageSize
 * --------------------------------------------------------------------- */

add_action( 'graphql_register_types', function () {
	if ( ! function_exists( 'register_graphql_object_type' ) ) {
		return; // WPGraphQL not active in this environment.
	}

	register_graphql_object_type( 'HectvRailPromoImage', [
		'description' => 'The rail promo image (b).',
		'fields'      => [
			'id'        => [ 'type' => 'Int' ],
			'sourceUrl' => [ 'type' => 'String' ],
			'altText'   => [ 'type' => 'String' ],
		],
	] );

	register_graphql_object_type( 'HectvRailPromo', [
		'description' => 'Rail promo card site option (b).',
		'fields'      => [
			'image' => [ 'type' => 'HectvRailPromoImage' ],
			'url'   => [ 'type' => 'String' ],
			'alt'   => [ 'type' => 'String' ],
		],
	] );

	register_graphql_object_type( 'HectvSiteOptions', [
		'description' => 'Root grouping for hectv-site-options mu-plugin fields.',
		'fields'      => [
			'railPromo' => [ 'type' => 'HectvRailPromo' ],
		],
	] );

	register_graphql_object_type( 'HectvTopbarCta', [
		'description' => 'A single customizable top-bar CTA button (g).',
		'fields'      => [
			'label' => [ 'type' => 'String' ],
			'url'   => [ 'type' => 'String' ],
			'style' => [ 'type' => 'String' ],
		],
	] );

	register_graphql_field( 'RootQuery', 'hectvSiteOptions', [
		'type'    => 'HectvSiteOptions',
		'resolve' => function () {
			return [ 'railPromo' => hectv_get_rail_promo() ];
		},
	] );

	register_graphql_field( 'RootQuery', 'topbarCtas', [
		'type'    => [ 'list_of' => 'HectvTopbarCta' ],
		'resolve' => function () {
			return hectv_get_topbar_ctas();
		},
	] );

	register_graphql_field( 'RootQuery', 'featuredVideos', [
		'type'    => [ 'list_of' => 'Post' ],
		'resolve' => function () {
			$ids = hectv_get_featured_video_ids();
			if ( empty( $ids ) ) {
				return [];
			}
			return array_values( array_filter( array_map( function ( $id ) {
				$post = get_post( $id );
				return ( $post && $post->post_type === 'post' && $post->post_status === 'publish' && class_exists( '\WPGraphQL\Model\Post' ) )
					? new \WPGraphQL\Model\Post( $post )
					: null;
			}, $ids ) ) );
		},
	] );

	register_graphql_field( 'Post', 'headerImageSize', [
		'type'    => 'String',
		'resolve' => function ( $post ) {
			$post_id = $post->ID ?? ( $post->databaseId ?? 0 );
			$value   = $post_id ? get_post_meta( $post_id, HECTV_HEADER_IMAGE_SIZE_META, true ) : '';
			return $value ?: 'full';
		},
	] );
} );

/* -----------------------------------------------------------------------
 * wp-admin: Settings page (b, c, g) + post editor metabox (f)
 * --------------------------------------------------------------------- */

add_action( 'admin_menu', function () {
	add_options_page(
		'HEC Site Options',
		'HEC Site Options',
		'manage_options',
		'hectv-site-options',
		'hectv_render_settings_page'
	);
} );

function hectv_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$errors = [];
	if ( isset( $_POST['hectv_site_options_nonce'] ) && check_admin_referer( 'hectv_site_options_save', 'hectv_site_options_nonce' ) ) {
		$rail_promo = hectv_sanitize_rail_promo( [
			'image_id' => $_POST['hectv_rail_promo_image_id'] ?? '',
			'url'      => $_POST['hectv_rail_promo_url'] ?? '',
			'alt'      => $_POST['hectv_rail_promo_alt'] ?? '',
		] );
		if ( is_wp_error( $rail_promo ) ) {
			$errors[] = $rail_promo->get_error_message();
		} else {
			update_option( HECTV_RAIL_PROMO_OPTION, $rail_promo );
		}

		$raw_videos = array_filter( array_map( 'trim', explode( ',', $_POST['hectv_featured_videos'] ?? '' ) ) );
		update_option( HECTV_FEATURED_VIDEOS_OPTION, hectv_sanitize_featured_videos( $raw_videos ) );

		$ctas = [];
		foreach ( (array) ( $_POST['hectv_topbar_ctas_label'] ?? [] ) as $i => $label ) {
			$ctas[] = [
				'label' => $label,
				'url'   => $_POST['hectv_topbar_ctas_url'][ $i ] ?? '',
				'style' => $_POST['hectv_topbar_ctas_style'][ $i ] ?? '',
			];
		}
		update_option( HECTV_TOPBAR_CTAS_OPTION, hectv_sanitize_topbar_ctas( $ctas ) );

		if ( empty( $errors ) ) {
			echo '<div class="notice notice-success"><p>Saved.</p></div>';
		}
	}

	foreach ( $errors as $error ) {
		printf( '<div class="notice notice-error"><p>%s</p></div>', esc_html( $error ) );
	}

	$rail_promo_raw = get_option( HECTV_RAIL_PROMO_OPTION, [] );
	$featured_ids   = hectv_get_featured_video_ids();
	$ctas           = hectv_get_topbar_ctas();
	?>
	<div class="wrap">
		<h1>HEC Site Options</h1>
		<form method="post">
			<?php wp_nonce_field( 'hectv_site_options_save', 'hectv_site_options_nonce' ); ?>
			<h2>Rail promo (b)</h2>
			<p>
				<label>Image attachment ID <input type="number" name="hectv_rail_promo_image_id" value="<?php echo esc_attr( $rail_promo_raw['image_id'] ?? '' ); ?>"></label><br>
				<label>URL <input type="url" name="hectv_rail_promo_url" value="<?php echo esc_attr( $rail_promo_raw['url'] ?? '' ); ?>"></label><br>
				<label>Alt text <input type="text" name="hectv_rail_promo_alt" value="<?php echo esc_attr( $rail_promo_raw['alt'] ?? '' ); ?>"></label>
			</p>
			<h2>Featured videos (c)</h2>
			<p><label>Post IDs, comma-separated <input type="text" name="hectv_featured_videos" value="<?php echo esc_attr( implode( ',', $featured_ids ) ); ?>"></label></p>
			<h2>Topbar CTAs (g)</h2>
			<?php for ( $i = 0; $i < 5; $i++ ) :
				$cta = $ctas[ $i ] ?? [ 'label' => '', 'url' => '', 'style' => '' ]; ?>
				<p>
					<input type="text" name="hectv_topbar_ctas_label[]" placeholder="Label" value="<?php echo esc_attr( $cta['label'] ); ?>">
					<input type="url" name="hectv_topbar_ctas_url[]" placeholder="URL" value="<?php echo esc_attr( $cta['url'] ); ?>">
					<select name="hectv_topbar_ctas_style[]">
						<option value="">--</option>
						<?php foreach ( HECTV_TOPBAR_CTA_STYLES as $style ) : ?>
							<option value="<?php echo esc_attr( $style ); ?>" <?php selected( $cta['style'], $style ); ?>><?php echo esc_html( $style ); ?></option>
						<?php endforeach; ?>
					</select>
				</p>
			<?php endfor; ?>
			<?php submit_button( 'Save HEC Site Options' ); ?>
		</form>
	</div>
	<?php
}

add_action( 'add_meta_boxes', function () {
	add_meta_box(
		'hectv_header_image_size',
		'Header image size (f)',
		'hectv_render_header_image_size_metabox',
		'post',
		'side'
	);
} );

function hectv_render_header_image_size_metabox( $post ) {
	wp_nonce_field( 'hectv_header_image_size_save', 'hectv_header_image_size_nonce' );
	$value = get_post_meta( $post->ID, HECTV_HEADER_IMAGE_SIZE_META, true ) ?: 'full';
	?>
	<select name="hectv_header_image_size" style="width:100%">
		<?php foreach ( HECTV_HEADER_IMAGE_SIZES as $size ) : ?>
			<option value="<?php echo esc_attr( $size ); ?>" <?php selected( $value, $size ); ?>><?php echo esc_html( $size ); ?></option>
		<?php endforeach; ?>
	</select>
	<?php
}

add_action( 'save_post', function ( $post_id ) {
	if ( ! isset( $_POST['hectv_header_image_size_nonce'] ) ||
		! wp_verify_nonce( $_POST['hectv_header_image_size_nonce'], 'hectv_header_image_size_save' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	if ( isset( $_POST['hectv_header_image_size'] ) ) {
		update_post_meta( $post_id, HECTV_HEADER_IMAGE_SIZE_META, hectv_sanitize_header_image_size( $_POST['hectv_header_image_size'] ) );
	}
} );
