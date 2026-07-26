<?php
/**
 * Register the deterministic menu locations used by the local HECMedia fixture.
 *
 * The stock block theme does not register classic navigation locations.
 * WPGraphQL only exposes classic menus when the active theme supports them,
 * so keep the local schema aligned with the application contract here.
 */

add_action( 'after_setup_theme', function () {
	register_nav_menus( [
		'header'    => 'Header',
		'footer'    => 'Footer',
		'social'    => 'Social',
		'podcasts'  => 'Podcasts',
		'bottomnav' => 'Bottom navigation',
	] );
} );
