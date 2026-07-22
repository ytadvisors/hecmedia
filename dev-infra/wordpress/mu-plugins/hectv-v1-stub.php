<?php
/**
 * Plugin Name: HECMedia hectv/v1 local dev stub
 * Description: LOCAL DEV ONLY. Reproduces the URL shape of the custom hectv/v1
 *              REST namespace that store/api/AccountApi.js and PostApi.js call
 *              in production (prod-wp.hectv.org). The real plugin is custom
 *              WordPress-side code that is not present in this repo or any repo
 *              available to this environment, so its actual auth/video logic
 *              could not be audited or ported. This stub exists only so local
 *              development and tests can hit the same endpoints and get a
 *              well-formed fixture response instead of a 404 — it does not
 *              implement real authentication, tokens, or live video lookup.
 *              Never install on a non-local environment.
 */

add_action( 'rest_api_init', function () {
	register_rest_route( 'hectv/v1', '/livevideos/live', [
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return new WP_REST_Response( [
				'live'  => false,
				'items' => [],
				'_stub' => 'hectv-v1-stub: no live video source in local dev',
			], 200 );
		},
	] );

	register_rest_route( 'hectv/v1', '/token/email', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $request ) {
			return new WP_REST_Response( [
				'token' => 'dev-stub-token',
				'user'  => [ 'email' => $request->get_param( 'email' ) ],
				'_stub' => true,
			], 200 );
		},
	] );

	register_rest_route( 'hectv/v1', '/token/thirdparty', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return new WP_REST_Response( [ 'token' => 'dev-stub-token', '_stub' => true ], 200 );
		},
	] );

	register_rest_route( 'hectv/v1', '/users/me', [
		'methods'             => 'GET,PUT',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return new WP_REST_Response( [
				'id'    => 1,
				'email' => 'dev@localhost',
				'_stub' => true,
			], 200 );
		},
	] );

	register_rest_route( 'hectv/v1', '/users', [
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			return new WP_REST_Response( [ 'id' => 1, '_stub' => true ], 201 );
		},
	] );
} );
